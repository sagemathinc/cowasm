set -ev

rsync -axvH ~/upstream/dash/src/ src/
cat ../../src/patches/* | patch -p1
touch src/*.c
./rebuild.sh 
sh-wasm
