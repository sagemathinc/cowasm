# We have to make the script that npm creates a little better; otherwise,
# the symlink isn't resolved properly.

export BASEDIR=`pwd`/node_modules/.bin
sed -i .bak "s@basedir=.*\$@basedir='$BASEDIR'@" node_modules/.bin/pnp*
