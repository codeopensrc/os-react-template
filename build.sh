#!/usr/bin/env bash

### WORKS RUNNING LOCALLY WITH A REMOTE BUILDKIT POD
## Have not tested building/deploying from remote/automated env
## Comments are rough notes leftover - keeping until solid strategy in place

## Use in local cli to quickly bootstrap buildkit pod remotely
## Uses current kube-context to determine cluster
## TODO: Check for pre-deployed or previously launched builders
#docker buildx create \
#  --driver=kubernetes \
#  --bootstrap \
#  --name buildkitd \
#  --driver-opt=namespace=default \
#  --use

#/run/buildkit/buildkitd.sock

### NEED push=true AND local.push=true in skaffold

BUILD_TARGET=src
CACHE_FROM_IMAGE=${IMAGE//:*/:dev}

BUILDKIT_POD_NAME=buildkitd-0
BUILDKIT_POD_NAMESPACE=default

#kubernetes:///buildkitd?deployment=&kubeconfig=
    #--addr kube-pod://buildkitd-0-5cf5fbcb59-f4h5j?namespace=buildkitd \
if [[ $1 == "ctl" ]]; then
  buildctl \
    --addr kube-pod://${BUILDKIT_POD_NAME}?namespace=${BUILDKIT_POD_NAMESPACE} \
    build \
    --frontend dockerfile.v0 \
    --local dockerfile=. \
    --local context=. \
    --opt build-arg:BASE_IMAGE=alpine \
    --opt build-arg:BASE_IMAGE_TAG=3.14 \
    --opt build-arg:NODE_VER=14.20.1-r0 \
    --opt build-arg:NPM_VER=7.17.0-r0   \
    --opt build-arg:PM2_VER=5.1.1       \
    --opt target=${BUILD_TARGET} \
    --import-cache type=registry,ref=${CACHE_FROM_IMAGE} \
    --export-cache type=inline \
    --output type=image,\"name=$IMAGE,name=${CACHE_FROM_IMAGE}\",push=true


    #--import-cache type=local,src=/tmp/buildkitcache \
    #--export-cache type=local,dest=/tmp/buildkitcache \
    #--output type=docker,name=$IMAGE | minikube image load -
fi
    #--import-cache type=local,src=/tmp/buildkitcache \

if [[ $1 == "buildx" ]]; then
  docker buildx build \
    # --builder buildkitd \
    -t $IMAGE \
    --build-arg=BASE_IMAGE=alpine \
    --build-arg=BASE_IMAGE_TAG=3.14 \
    --build-arg=NODE_VER=14.20.0-r0 \
    --build-arg=NPM_VER=7.17.0-r0   \
    --build-arg=PM2_VER=5.1.1       \
    --target=${BUILD_TARGET} \
    --cache-from=type=local,src=/tmp/buildkitcache \
    --cache-to=type=local,dest=/tmp/buildkitcache \
    --load \
    .

  #buildctl \
    #--addr kube-pod://buildkitd \
    #--output type=docker,name=$IMAGE | minikube image load -
fi
