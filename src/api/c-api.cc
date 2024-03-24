
#include "c-api.h"
#include <v8.h>
#include <libplatform/libplatform.h>
#include <v8-context.h>
#include <v8-initialization.h>
#include <v8-isolate.h>
#include <v8-local-handle.h>
#include <v8-primitive.h>
#include <v8-script.h>


OpaqueVM createVM() {
    // v8::V8::InitializeICUDefaultLocation(argv[0]);
    // v8::V8::InitializeExternalStartupData(argv[0]);
    std::unique_ptr<v8::Platform> platform = v8::platform::NewDefaultPlatform();
    v8::V8::InitializePlatform(platform.release());
    v8::V8::Initialize();

    v8::Isolate::CreateParams create_params;
    create_params.array_buffer_allocator =
        v8::ArrayBuffer::Allocator::NewDefaultAllocator();
    v8::Isolate* isolate = v8::Isolate::New(create_params);

    return reinterpret_cast<OpaqueVM>(isolate);
}

const char* ToCString(const v8::String::Utf8Value& value) {
  return *value ? *value : "<string conversion failed>";
}

// The callback that is invoked by v8 whenever the JavaScript 'print'
// function is called.  Prints its arguments on stdout separated by
// spaces and ending with a newline.
void Print(const v8::FunctionCallbackInfo<v8::Value>& info) {
  bool first = true;
  for (int i = 0; i < info.Length(); i++) {
    v8::HandleScope handle_scope(info.GetIsolate());
    if (first) {
      first = false;
    } else {
      printf(" ");
    }
    v8::String::Utf8Value str(info.GetIsolate(), info[i]);
    const char* cstr = ToCString(str);
    printf("%s", cstr);
  }
  printf("\n");
  fflush(stdout);
} 

v8::Local<v8::Context> CreateShellContext(v8::Isolate* isolate) {
  v8::Local<v8::ObjectTemplate> global = v8::ObjectTemplate::New(isolate);
  global->Set(isolate, "print", v8::FunctionTemplate::New(isolate, Print));

  return v8::Context::New(isolate, NULL, global);
}



void evaluateScript(OpaqueVM vm, const char* text) {
    // auto worker = initWorker();
    auto _vm = reinterpret_cast<v8::Isolate*>(vm);

    {
        v8::Isolate::Scope isolate_scope(_vm);
        v8::HandleScope handle_scope(_vm);
        v8::Local<v8::Context> context = CreateShellContext(_vm);
        v8::Context::Scope context_scope(context);

        v8::Local<v8::String> source =
            v8::String::NewFromUtf8(_vm, text).ToLocalChecked();

        v8::Local<v8::Script> script =
            v8::Script::Compile(context, source).ToLocalChecked();

        script->Run(context).ToLocalChecked();
    }
}


//   isolate->Dispose();
//   v8::V8::Dispose();
//   v8::V8::DisposePlatform();
//   delete create_params.array_buffer_allocator;

