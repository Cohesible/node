# Node.js 22 ChangeLog

<!--lint disable maximum-line-length no-literal-urls prohibited-strings-->

<table>
<tr>
<th>Current</th>
</tr>
<tr>
<td>
<a href="#22.0.0">22.0.0</a><br/>
</td>
</tr>
</table>

* Other Versions
  * [21.x](CHANGELOG_V21.md)
  * [20.x](CHANGELOG_V20.md)
  * [19.x](CHANGELOG_V19.md)
  * [18.x](CHANGELOG_V18.md)
  * [17.x](CHANGELOG_V17.md)
  * [16.x](CHANGELOG_V16.md)
  * [15.x](CHANGELOG_V15.md)
  * [14.x](CHANGELOG_V14.md)
  * [13.x](CHANGELOG_V13.md)
  * [12.x](CHANGELOG_V12.md)
  * [11.x](CHANGELOG_V11.md)
  * [10.x](CHANGELOG_V10.md)
  * [9.x](CHANGELOG_V9.md)
  * [8.x](CHANGELOG_V8.md)
  * [7.x](CHANGELOG_V7.md)
  * [6.x](CHANGELOG_V6.md)
  * [5.x](CHANGELOG_V5.md)
  * [4.x](CHANGELOG_V4.md)
  * [0.12.x](CHANGELOG_V012.md)
  * [0.10.x](CHANGELOG_V010.md)
  * [io.js](CHANGELOG_IOJS.md)
  * [Archive](CHANGELOG_ARCHIVE.md)

<a id="22.0.0"></a>

## 2024-04-23, Version 22.0.0 (Current), @RafaelGSS and @marco-ippolito

TBD

### Semver-Major Commits

* \[[`94f0369d1d`](https://github.com/nodejs/node/commit/94f0369d1d)] - **(SEMVER-MAJOR)** **build**: reset embedder string to "-node.0" (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`58674cd1d8`](https://github.com/nodejs/node/commit/58674cd1d8)] - **(SEMVER-MAJOR)** **build**: reset embedder string to "-node.0" (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`60e836427e`](https://github.com/nodejs/node/commit/60e836427e)] - **(SEMVER-MAJOR)** **console**: treat non-strings as separate argument in console.assert() (Jacob Hummer) [#49722](https://github.com/nodejs/node/pull/49722)
* \[[`d62ab3a1ef`](https://github.com/nodejs/node/commit/d62ab3a1ef)] - **(SEMVER-MAJOR)** **crypto**: runtime deprecate hmac constructor (Marco Ippolito) [#52071](https://github.com/nodejs/node/pull/52071)
* \[[`de0602d190`](https://github.com/nodejs/node/commit/de0602d190)] - **(SEMVER-MAJOR)** **crypto**: runtime deprecate Hash constructor (Marco Ippolito) [#51880](https://github.com/nodejs/node/pull/51880)
* \[[`215f4d04b7`](https://github.com/nodejs/node/commit/215f4d04b7)] - **(SEMVER-MAJOR)** **crypto**: move createCipher and createDecipher to eol (Marco Ippolito) [#50973](https://github.com/nodejs/node/pull/50973)
* \[[`61a0d3b4c4`](https://github.com/nodejs/node/commit/61a0d3b4c4)] - **(SEMVER-MAJOR)** **deps**: V8: backport c4be0a97f981 (Richard Lau) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`f55380a725`](https://github.com/nodejs/node/commit/f55380a725)] - **(SEMVER-MAJOR)** **deps**: V8: cherry-pick f8d5e576b814 (Richard Lau) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`b9d806a2dd`](https://github.com/nodejs/node/commit/b9d806a2dd)] - **(SEMVER-MAJOR)** **deps**: patch V8 to support compilation with MSVC (StefanStojanovic) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`63b58bc17b`](https://github.com/nodejs/node/commit/63b58bc17b)] - **(SEMVER-MAJOR)** **deps**: patch V8 to avoid duplicated zlib symbol (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`86056353c4`](https://github.com/nodejs/node/commit/86056353c4)] - **(SEMVER-MAJOR)** **deps**: remove usage of a C++20 feature from V8 (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`2e0efc1c8d`](https://github.com/nodejs/node/commit/2e0efc1c8d)] - **(SEMVER-MAJOR)** **deps**: avoid compilation error with ASan (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`59e6f62e34`](https://github.com/nodejs/node/commit/59e6f62e34)] - **(SEMVER-MAJOR)** **deps**: disable V8 concurrent sparkplug compilation (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`0423f7e27e`](https://github.com/nodejs/node/commit/0423f7e27e)] - **(SEMVER-MAJOR)** **deps**: silence irrelevant V8 warning (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`f36620806d`](https://github.com/nodejs/node/commit/f36620806d)] - **(SEMVER-MAJOR)** **deps**: always define V8\_EXPORT\_PRIVATE as no-op (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`09a8440b45`](https://github.com/nodejs/node/commit/09a8440b45)] - **(SEMVER-MAJOR)** **deps**: update V8 to 12.2.281.27 (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`0da3beebfc`](https://github.com/nodejs/node/commit/0da3beebfc)] - **(SEMVER-MAJOR)** **deps**: V8: cherry-pick de611e69ad51 (Keyhan Vakil) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`b982335637`](https://github.com/nodejs/node/commit/b982335637)] - **(SEMVER-MAJOR)** **deps**: V8: cherry-pick 0fd478bcdabd (Joyee Cheung) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`481a90116c`](https://github.com/nodejs/node/commit/481a90116c)] - **(SEMVER-MAJOR)** **deps**: V8: cherry-pick 0f9ebbc672c7 (Chengzhong Wu) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`782addbdc3`](https://github.com/nodejs/node/commit/782addbdc3)] - **(SEMVER-MAJOR)** **deps**: V8: cherry-pick 8f0b94671ddb (Lu Yahan) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`b682e7f540`](https://github.com/nodejs/node/commit/b682e7f540)] - **(SEMVER-MAJOR)** **deps**: V8: cherry-pick f7d000a7ae7b (Luke Albao) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`a60090c52f`](https://github.com/nodejs/node/commit/a60090c52f)] - **(SEMVER-MAJOR)** **deps**: V8: cherry-pick 25902244ad1a (Joyee Cheung) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`8441d1fc18`](https://github.com/nodejs/node/commit/8441d1fc18)] - **(SEMVER-MAJOR)** **deps**: patch V8 to avoid duplicated zlib symbol (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`e8e9bbd7a9`](https://github.com/nodejs/node/commit/e8e9bbd7a9)] - **(SEMVER-MAJOR)** **deps**: remove usage of a C++20 feature from V8 (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`785d5cd006`](https://github.com/nodejs/node/commit/785d5cd006)] - **(SEMVER-MAJOR)** **deps**: avoid compilation error with ASan (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`7071c1dafd`](https://github.com/nodejs/node/commit/7071c1dafd)] - **(SEMVER-MAJOR)** **deps**: disable V8 concurrent sparkplug compilation (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`d1d60b297d`](https://github.com/nodejs/node/commit/d1d60b297d)] - **(SEMVER-MAJOR)** **deps**: silence irrelevant V8 warning (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`5b240c62f9`](https://github.com/nodejs/node/commit/5b240c62f9)] - **(SEMVER-MAJOR)** **deps**: always define V8\_EXPORT\_PRIVATE as no-op (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`d8c97e4857`](https://github.com/nodejs/node/commit/d8c97e4857)] - **(SEMVER-MAJOR)** **deps**: update V8 to 11.9.169.7 (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`b9df88a8c2`](https://github.com/nodejs/node/commit/b9df88a8c2)] - **(SEMVER-MAJOR)** **doc**: runtime deprecate flag --trace-atomics-wait (marco-ippolito) [#51179](https://github.com/nodejs/node/pull/51179)
* \[[`9ba5df30b4`](https://github.com/nodejs/node/commit/9ba5df30b4)] - **(SEMVER-MAJOR)** **doc**: bump FreeBSD experimental support to 13.2 (Michaël Zasso) [#51231](https://github.com/nodejs/node/pull/51231)
* \[[`900d79caf2`](https://github.com/nodejs/node/commit/900d79caf2)] - **(SEMVER-MAJOR)** **doc**: add migration paths for deprecated utils (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`8206f6bb7f`](https://github.com/nodejs/node/commit/8206f6bb7f)] - **(SEMVER-MAJOR)** **fs**: runtime deprecate fs.Stats constructor (Marco Ippolito) [#52067](https://github.com/nodejs/node/pull/52067)
* \[[`c14133503a`](https://github.com/nodejs/node/commit/c14133503a)] - **(SEMVER-MAJOR)** **fs**: use private fields instead of symbols for `Dir` (Jungku Lee) [#51037](https://github.com/nodejs/node/pull/51037)
* \[[`abbdc3efaa`](https://github.com/nodejs/node/commit/abbdc3efaa)] - **(SEMVER-MAJOR)** **fs**: make stats date fields lazy (Yagiz Nizipli) [#50908](https://github.com/nodejs/node/pull/50908)
* \[[`4b76ccea95`](https://github.com/nodejs/node/commit/4b76ccea95)] - **(SEMVER-MAJOR)** **http**: preserve raw header duplicates in writeHead after setHeader calls (Tim Perry) [#50394](https://github.com/nodejs/node/pull/50394)
* \[[`c975384264`](https://github.com/nodejs/node/commit/c975384264)] - **(SEMVER-MAJOR)** **lib**: enable WebSocket by default (Aras Abbasi) [#51594](https://github.com/nodejs/node/pull/51594)
* \[[`351495e938`](https://github.com/nodejs/node/commit/351495e938)] - **(SEMVER-MAJOR)** **lib,test**: handle new Iterator global (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`a8b21fdc90`](https://github.com/nodejs/node/commit/a8b21fdc90)] - **(SEMVER-MAJOR)** **process**: wait for `'exit'` before printing result (Antoine du Hamel) [#52172](https://github.com/nodejs/node/pull/52172)
* \[[`d248639285`](https://github.com/nodejs/node/commit/d248639285)] - **(SEMVER-MAJOR)** **src**: use supported API to get stalled TLA messages (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`d34b02db4c`](https://github.com/nodejs/node/commit/d34b02db4c)] - **(SEMVER-MAJOR)** **src**: update default V8 platform to override functions with location (Etienne Pierre-Doray) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`d9c47e9b5f`](https://github.com/nodejs/node/commit/d9c47e9b5f)] - **(SEMVER-MAJOR)** **src**: add missing TryCatch (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`5cddd3b2d8`](https://github.com/nodejs/node/commit/5cddd3b2d8)] - **(SEMVER-MAJOR)** **src**: update NODE\_MODULE\_VERSION to 124 (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`1528846ada`](https://github.com/nodejs/node/commit/1528846ada)] - **(SEMVER-MAJOR)** **src**: use non-deprecated v8::Uint8Array::kMaxLength (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`7166986626`](https://github.com/nodejs/node/commit/7166986626)] - **(SEMVER-MAJOR)** **src**: adapt to v8::Exception API change (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`4782818020`](https://github.com/nodejs/node/commit/4782818020)] - **(SEMVER-MAJOR)** **src**: use non-deprecated version of CreateSyntheticModule (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`2cff0ce411`](https://github.com/nodejs/node/commit/2cff0ce411)] - **(SEMVER-MAJOR)** **src**: update NODE\_MODULE\_VERSION to 122 (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`1abff07392`](https://github.com/nodejs/node/commit/1abff07392)] - **(SEMVER-MAJOR)** **stream**: bump default highWaterMark (Robert Nagy) [#52037](https://github.com/nodejs/node/pull/52037)
* \[[`9efc84a2cb`](https://github.com/nodejs/node/commit/9efc84a2cb)] - **(SEMVER-MAJOR)** **test**: mark test-worker-arraybuffer-zerofill as flaky (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`84c2e712eb`](https://github.com/nodejs/node/commit/84c2e712eb)] - **(SEMVER-MAJOR)** **test**: mark some GC-related tests as flaky (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`cdc4437b87`](https://github.com/nodejs/node/commit/cdc4437b87)] - **(SEMVER-MAJOR)** **test**: allow slightly more diff in memory leak test (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`515b007fae`](https://github.com/nodejs/node/commit/515b007fae)] - **(SEMVER-MAJOR)** **test**: replace always-opt flag with alway-turbofan (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`2341805eb2`](https://github.com/nodejs/node/commit/2341805eb2)] - **(SEMVER-MAJOR)** **test**: remove tests that create very large buffers (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`941cef5636`](https://github.com/nodejs/node/commit/941cef5636)] - **(SEMVER-MAJOR)** **test**: adapt to new V8 trusted memory spaces (Michaël Zasso) [#50115](https://github.com/nodejs/node/pull/50115)
* \[[`29de7f82cd`](https://github.com/nodejs/node/commit/29de7f82cd)] - **(SEMVER-MAJOR)** **test\_runner**: omit filtered test from output (Colin Ihrig) [#52221](https://github.com/nodejs/node/pull/52221)
* \[[`00dc6d9d97`](https://github.com/nodejs/node/commit/00dc6d9d97)] - **(SEMVER-MAJOR)** **test\_runner**: improve `--test-name-pattern` to allow matching single test (Michał Drobniak) [#51577](https://github.com/nodejs/node/pull/51577)
* \[[`c22793d050`](https://github.com/nodejs/node/commit/c22793d050)] - **(SEMVER-MAJOR)** **tools**: roughly port v8\_abseil to gyp (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`ffb0302f0c`](https://github.com/nodejs/node/commit/ffb0302f0c)] - **(SEMVER-MAJOR)** **tools**: update V8 gypfiles for 12.2 (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`aadea12440`](https://github.com/nodejs/node/commit/aadea12440)] - **(SEMVER-MAJOR)** **tools**: update V8 gypfiles for 12.1 (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`7784773967`](https://github.com/nodejs/node/commit/7784773967)] - **(SEMVER-MAJOR)** **tools**: update V8 gypfiles for 12.0 (Michaël Zasso) [#51362](https://github.com/nodejs/node/pull/51362)
* \[[`9fe0424baa`](https://github.com/nodejs/node/commit/9fe0424baa)] - **(SEMVER-MAJOR)** **trace\_events**: use private fields instead of symbols for `Tracing` (Jungku Lee) [#51180](https://github.com/nodejs/node/pull/51180)
* \[[`e96cd25007`](https://github.com/nodejs/node/commit/e96cd25007)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.log (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`6cf20d5e43`](https://github.com/nodejs/node/commit/6cf20d5e43)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isUndefined (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`09e424921f`](https://github.com/nodejs/node/commit/09e424921f)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isSymbol (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`80b6bfd4e9`](https://github.com/nodejs/node/commit/80b6bfd4e9)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isString (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`d419edded9`](https://github.com/nodejs/node/commit/d419edded9)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isRegExp (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`e0b8de78ed`](https://github.com/nodejs/node/commit/e0b8de78ed)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isPrimitive (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`5478e1129a`](https://github.com/nodejs/node/commit/5478e1129a)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isObject (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`b05b1dd541`](https://github.com/nodejs/node/commit/b05b1dd541)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isNumber (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`5af9bf5f6a`](https://github.com/nodejs/node/commit/5af9bf5f6a)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isNullOrUndefined (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`860a10e10e`](https://github.com/nodejs/node/commit/860a10e10e)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isNull (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`70330f5c2b`](https://github.com/nodejs/node/commit/70330f5c2b)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isFunction (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`7c69c33acc`](https://github.com/nodejs/node/commit/7c69c33acc)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isError (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`a0c5b871a9`](https://github.com/nodejs/node/commit/a0c5b871a9)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isDate (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`3c670cb15d`](https://github.com/nodejs/node/commit/3c670cb15d)] - **(SEMVER-MAJOR)** **util**: runtime deprecation util.isBuffer (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`c17a448ca9`](https://github.com/nodejs/node/commit/c17a448ca9)] - **(SEMVER-MAJOR)** **util**: runtime deprecation util.isBoolean (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`fbb2f891aa`](https://github.com/nodejs/node/commit/fbb2f891aa)] - **(SEMVER-MAJOR)** **util**: runtime deprecate util.isArray (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`22d8062e42`](https://github.com/nodejs/node/commit/22d8062e42)] - **(SEMVER-MAJOR)** **util**: runtime deprecation util.\_extend (Marco Ippolito) [#50488](https://github.com/nodejs/node/pull/50488)
* \[[`1a5acd0638`](https://github.com/nodejs/node/commit/1a5acd0638)] - **(SEMVER-MAJOR)** **v8**: enable maglev on supported architectures (Keyhan Vakil) [#51360](https://github.com/nodejs/node/pull/51360)

### Semver-Minor Commits

TBD

### Semver-Patch Commits

TBD
