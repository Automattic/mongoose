# note: in order to use FLE with mongodb, we must
#  have mongocryptd or the shared library downloaded
#  have an enterprise server >= 4.2

# this script downloads all tools required to use FLE with mongodb, then starts a cluster of the provided configuration (sharded on 8.0 server)

export CWD=$(pwd);
export DRIVERS_TOOLS_PINNED_COMMIT=35d0592c76f4f3d25a5607895eb21b491dd52543;

# install extra dependency
npm install mongodb-client-encryption

# set up mongodb cluster and encryption configuration if the data/ folder does not exist
if [ ! -d "data" ]; then

  mkdir data
  cd data

  # note:
  # we're using drivers-evergreen-tools which is a repo used by MongoDB drivers to start clusters for testing.
  # if you'd like to make changes to the cluster settings, edit the exported variables below.
  # for configuration options for the exported variables, see here: https://github.com/mongodb-labs/drivers-evergreen-tools/blob/master/.evergreen/run-orchestration.sh
  # after this script is run, the data/ folder will notably contain the following:
  # 'mo-expansion.yml' file which contains for your cluster URI and crypt shared library path
  # 'drivers-evergreen-tools/mongodb/bin' which contain executables for other mongodb libraries such as mongocryptd, mongosh, and mongod
  if [ ! -d "drivers-evergreen-tools/" ]; then
    git clone "https://github.com/mongodb-labs/drivers-evergreen-tools.git"
    # pin stable commit
    cd drivers-evergreen-tools
    git checkout $DRIVERS_TOOLS_PINNED_COMMIT
    cd ..
  fi

  # configure cluster settings
  export DRIVERS_TOOLS=$CWD/data/drivers-evergreen-tools
  export MONGODB_VERSION=8.0
  export AUTH=true
  export MONGODB_BINARIES=$DRIVERS_TOOLS/mongodb/bin
  export MONGO_ORCHESTRATION_HOME=$DRIVERS_TOOLS/mo
  export PROJECT_ORCHESTRATION_HOME=$DRIVERS_TOOLS/.evergreen/orchestration
  export TOPOLOGY=sharded_cluster
  export SSL=nossl

  cd $DRIVERS_TOOLS
  rm -rf mongosh mongodb mo
  mkdir mo
  cd -

  rm expansions.sh 2> /dev/null

  echo 'Configuring Cluster...'

  # start cluster
  (bash $DRIVERS_TOOLS/.evergreen/run-orchestration.sh) 1> /dev/null 2> /dev/null

  echo 'Cluster Configuration Finished!'

  cd ..
fi
