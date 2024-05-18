@ECHO OFF

echo LIBRARY synapse.exe > synapse.def
echo EXPORTS >> synapse.def
for /f "skip=19 tokens=4" %%A in ('dumpbin /exports %cd%\out\Release\node.exe') do echo %%A >> synapse.def

lib /def:synapse.def /out:synapse.lib /machine:x64