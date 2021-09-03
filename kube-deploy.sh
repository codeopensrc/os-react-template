#!/bin/bash

while getopts "t:a:r:i:" flag; do
    # These become set during 'getopts'  --- $OPTIND $OPTARG
    case "$flag" in
        t) OPT_TAG=${OPTARG};;
        a) OPT_APPNAME=${OPTARG};;
        r) OPT_REGISTRY=${OPTARG};;
        i) OPT_IMAGE=${OPTARG};;
    esac
done

## Get variables based on docker-compose.yml
IMAGE=$(grep -m1 "image: registry" docker-compose.yml | cut -d ":" -f2)
if [[ -n $OPT_IMAGE ]]; then IMAGE=$OPT_IMAGE; fi;

TAG=$(grep -m1 "image: registry" docker-compose.yml | cut -d ":" -f3)
if [[ -n $OPT_TAG ]]; then TAG=$OPT_TAG; fi;

APPNAME=$(echo $IMAGE | sed -re "s|.*/([^/]*)/.*$|\1|" | sed "s/\./-/g")
if [[ -n $OPT_APPNAME ]]; then APPNAME=$OPT_APPNAME; fi;

if [[ -n $OPT_REGISTRY ]]; then 
    IMAGE=$(echo $IMAGE | sed -r "s|^[^/]*/(.*)|$OPT_REGISTRY/\1|g")
fi

PROD_PORT=$(awk '/image: registry/{getline; print; exit;}' docker-compose.yml)
IMAGE_PORT=$(echo $PROD_PORT | sed -re 's/.*:([[:digit:]]+)".*/\1/')

COMMIT_SHA=$(git log -1 --format="%H")

CI_ENVIRONMENT_SLUG=${CI_ENVIRONMENT_SLUG:-"dev"}
CI_PROJECT_PATH_SLUG=${CI_PROJECT_PATH_SLUG:-"dev"}


echo "APPNAME: $APPNAME"
echo "IMAGE: $IMAGE"
echo "TAG: $TAG"
echo "IMAGE_PORT: $IMAGE_PORT"

#exit

if [[ -f .env ]]; then
    source .env;
else
    echo "No .env found, some variables may not be available in deployment.";
fi

## Create kubernetes secret for app and create a hash
## Hash is used to force a redeploy on secret change
SECRET_YAML_HASH=`tee >(kubectl apply -f -) <<EOF | sha256sum
apiVersion: v1
kind: Secret
metadata:
  name: $APPNAME
type: Opaque
stringData:
  SAMPLE_SECRET: "${SAMPLE_SECRET}"
EOF
`

CONFIG_YAML_HASH=`tee >(kubectl apply -f -) <<EOF | sha256sum
apiVersion: v1
kind: ConfigMap
metadata:
  name: $APPNAME
data:
  CONSUL_SERVICE_NAME:  "react-template"
  REGISTER_SERVICE:     "false"
  AUTH_URL:             "${AUTH_URL}"
EOF
`


## Create a kubernetes service
## Create a kubernetes deployment
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: $APPNAME
  annotations:
    app.gitlab.com/env: $CI_ENVIRONMENT_SLUG
    app.gitlab.com/app: $CI_PROJECT_PATH_SLUG 
spec:
  selector:
    app: $APPNAME
  ports:
    - protocol: TCP
      port: 80
      targetPort: $IMAGE_PORT
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $APPNAME
  labels:
    app: $APPNAME
  annotations:
    app.gitlab.com/env: $CI_ENVIRONMENT_SLUG
    app.gitlab.com/app: $CI_PROJECT_PATH_SLUG 
    configHash: $CONFIG_YAML_HASH
    secretHash: $SECRET_YAML_HASH
    commitSha: $COMMIT_SHA
spec:
  replicas: 1
  selector:
    matchLabels:
      app: $APPNAME
  template:
    metadata:
      labels:
        app: $APPNAME
      annotations:
        app.gitlab.com/env: $CI_ENVIRONMENT_SLUG
        app.gitlab.com/app: $CI_PROJECT_PATH_SLUG 
        configHash: $CONFIG_YAML_HASH
        secretHash: $SECRET_YAML_HASH
        commitSha: $COMMIT_SHA
    spec:
      containers:
      - name: $APPNAME
        image: $IMAGE:$TAG
        ports:
        - containerPort: $IMAGE_PORT
        envFrom:
        - configMapRef:
            name: $APPNAME
        - secretRef:
            name: $APPNAME
EOF
