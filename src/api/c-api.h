#ifdef __cplusplus
extern "C" {
#endif

typedef struct OpaqueJSContext* OpaqueContext;
typedef struct OpaqueJSVM* OpaqueVM;

OpaqueVM createVM();
// OpaqueContext createContext(OpaqueVM vm);

void evaluateScript(OpaqueVM vm, const char* text);

#ifdef __cplusplus
}
#endif
