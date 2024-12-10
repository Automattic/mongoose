
export CWD=$(pwd);
mkdir encrypted-cluster
cd encrypted-cluster

if [ ! -d "drivers-evergreen-tools/" ]; then
 git clone --depth=1 "https://github.com/mongodb-labs/drivers-evergreen-tools.git"
fi

export DRIVERS_TOOLS=$CWD/encrypted-cluster/drivers-evergreen-tools
export MONGODB_VERSION=8.0
export AUTH=true
export MONGODB_BINARIES=$DRIVERS_TOOLS/mongodb/bin
export NODE_DRIVER=~/dev/node-mongodb-native
export MONGO_ORCHESTRATION_HOME=$DRIVERS_TOOLS/mo
export PROJECT_ORCHESTRATION_HOME=$DRIVERS_TOOLS/.evergreen/orchestration
export TOPOLOGY=sharded_cluster
export SSL=nossl

cd $DRIVERS_TOOLS
rm -rf mongosh mongodb mo
mkdir mo
cd -

rm expansions.sh 2> /dev/null

bash $DRIVERS_TOOLS/.evergreen/run-orchestration.sh