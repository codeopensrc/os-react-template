#!/bin/bash

## Group level protected environments for free but project not? interesting
## https://docs.gitlab.com/ee/ci/environments/protected_environments.html#enable-or-disable-group-level-protected-environments

## grep, echo, sed, tee, awk, git, sha256sum, kubectl  all req in image/os
## all available in alpine/busybox (minus kubectl)

while getopts "t:a:r:i:n:" flag; do
    # These become set during 'getopts'  --- $OPTIND $OPTARG
    case "$flag" in
        t) OPT_TAG=${OPTARG};;
        a) OPT_APPNAME=${OPTARG};;
        r) OPT_REGISTRY=${OPTARG};;
        i) OPT_IMAGE=${OPTARG};;
        n) NAMESPACE=${OPTARG};;
    esac
done

PROD_SERVICE_NAME="main:"

## Get variables based on docker-compose.yml
PROD_IMAGE=$(awk "/${PROD_SERVICE_NAME}/{getline; print; exit;}" docker-compose.yml)
PROD_PORT=$(awk "/${PROD_SERVICE_NAME}/{getline; getline; print; exit;}" docker-compose.yml)

IMAGE=$(echo $PROD_IMAGE | cut -d ":" -f2)
if [[ -n $OPT_IMAGE ]]; then IMAGE=$OPT_IMAGE; fi;

TAG=$(echo $PROD_IMAGE | cut -d ":" -f3)
if [[ -n $OPT_TAG ]]; then TAG=$OPT_TAG; fi;

APPNAME=$(echo $IMAGE | sed -re "s|.*/([^/]*)/.*$|\1|" | sed "s/\./-/g")
if [[ -n $OPT_APPNAME ]]; then APPNAME=$OPT_APPNAME; fi;

if [[ -n $OPT_REGISTRY ]]; then
    IMAGE=$(echo $IMAGE | sed -r "s|^[^/]*/(.*)|$OPT_REGISTRY/\1|g")
fi

IMAGE_PORT=$(echo $PROD_PORT | sed -re 's/.*:([[:digit:]]+)".*/\1/')

COMMIT_SHA=$(git log -1 --format="%H")

CI_ENVIRONMENT_SLUG=${CI_ENVIRONMENT_SLUG:-"dev"}
CI_PROJECT_PATH_SLUG=${CI_PROJECT_PATH_SLUG:-$APPNAME}


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

##TODO: Add readiness/liveliness probes for near-zero downtime
## Create a kubernetes service
## Create a kubernetes deployment
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: $APPNAME
  namespace: $NAMESPACE
  labels:
    app: $APPNAME
    env: $CI_ENVIRONMENT_SLUG
  annotations:
    app.gitlab.com/app: $CI_PROJECT_PATH_SLUG
    app.gitlab.com/env: $CI_ENVIRONMENT_SLUG
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
  namespace: $NAMESPACE
  labels:
    app: $APPNAME
    env: $CI_ENVIRONMENT_SLUG
  annotations:
    app.gitlab.com/app: $CI_PROJECT_PATH_SLUG
    app.gitlab.com/env: $CI_ENVIRONMENT_SLUG
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
        env: $CI_ENVIRONMENT_SLUG
      annotations:
        app.gitlab.com/app: $CI_PROJECT_PATH_SLUG
        app.gitlab.com/env: $CI_ENVIRONMENT_SLUG
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


## Figure out a good universal way to force a redeployment even if the image tag matches
##   pull_policy always doesnt ensure itll pull a newer version. Think we can set that option
##   in the deployment config itself
  ## Found this -
##  - |
##       if kubectl apply -f deployment.yaml | grep -q unchanged; then
##           echo "=> Patching deployment to force image update."
##           kubectl patch -f deployment.yaml -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"ci-last-updated\":\"$(date +'%s')\"}}}}}"
##       else
##           echo "=> Deployment apply has changed the object, no need to force image update."
##       fi
