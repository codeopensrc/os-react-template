[![Gitlab pipeline status (self-hosted)](https://img.shields.io/gitlab/pipeline/os/react-template/master?gitlab_url=https%3A%2F%2Fgitlab.codeopensrc.com&label=CI%2FCD&logo=Azure%20Pipelines)](https://gitlab.codeopensrc.com/os/react-template/-/pipelines)
&nbsp; &nbsp; &nbsp;
[![GitLab tag (custom instance)](https://img.shields.io/gitlab/v/tag/os/react-template?gitlab_url=https%3A%2F%2Fgitlab.codeopensrc.com&include_prereleases&label=Latest%20Release&logo=Gitlab)](https://gitlab.codeopensrc.com/os/react-template/-/tags)
&nbsp; &nbsp; &nbsp;
[![GitHub last commit](https://img.shields.io/github/last-commit/codeopensrc/os-react-template?label=Last%20Commit&logo=Git)](https://gitlab.codeopensrc.com/os/react-template/-/commits/master)
&nbsp; &nbsp; &nbsp;
[![Docker](https://img.shields.io/badge/Image-latest-blue?logo=Docker)](https://gitlab.codeopensrc.com/os/react-template/container_registry/10)

### Running
**[Docker Engine](https://docs.docker.com/engine/installation)**  
**[Docker Compose](https://docs.docker.com/compose/install)**

- Download the `docker-compose.yml` file:  
`curl -O https://gitlab.codeopensrc.com/os/react-template/-/raw/master/docker-compose.yml`  
`touch .env.tmpl`  
- Pull Image:  
`docker-compose pull main`  
- And run:  
`docker-compose up main [-d]`  
- Project will be available at `localhost:5000` (main default)  

---

### Development  
1) Clone  
`git clone https://gitlab.codeopensrc.com/os/react-template.git`  

2) Edit the `dev` service in `docker-compose.yml` to suit your needs   
2a) (optional) Create .env file from template.  
`cp .env.tmpl .env`  
2b) If using windows then 2a. is not optional and both of the following uncommented and modified
```bash
COMPOSE_CONVERT_WINDOWS_PATHS=1  
FOLDER_LOCATION=/ABSOLUTE/PATH/TO/WINDOWS/FOLDER/react-template  
```

3) Build it  
`docker-compose build dev`  

4) In project root run:  
`docker-compose up dev [-d]`  

5) Project will be available at `localhost:5005` (dev default)  

6) Run webpack inside the container. (Another terminal if not using `-d`):  
`docker exec CONTAINER_NAME npm run watch`  

7) Modify files in `src/*` and `server/*`  

8) See changes at `localhost:5005`  

---

### Hot Reloading

Enable hot reloading (component updates without page refresh) for react components by adjusting a step and using a different port.

- Replace the command in #6 from above  
 `docker exec CONTAINER_NAME npm run watch`  
to  
`docker exec -it CONTAINER_NAME npm run reloader`  
The `-it` allows Ctrl+c to stop the `webpack-dev-server` started inside of the container.  

- Instead of loading `localhost:5005`, load `localhost:5055`  
See ports in `docker-compose.yml` and `src/config/webpack.config.js` to adjust.  

Now with `:5055` loaded in the browser, when you update a react component you can see the page re-render it. The component should keep its state and will not re-run `componentDidMount`.  

---

### Database

By default the database will not start and connect without editing `docker-compose.yml`.  
- Under `environment` for the `dev` service, change  
`ENABLE_DB: "false"` to `ENABLE_DB: "true"`  

- Uncomment the following lines in `docker-compose.yml`  
```yaml
        #depends_on:
        #    - mongodb
```
to
```yaml
        depends_on:
            - mongodb
```

Now when `docker-compose up dev` is run, a mongodb image will be pulled, start, and the server will connect to it using the `DEV_DATABASE_URL_ORIGIN/MONGO_DB_NAME` connection string.  

---

### Source
Development being done using a self-hosted GitLab instance.  
**[GitLab](https://gitlab.codeopensrc.com/os/react-template)**  
**[GitHub Mirror](https://github.com/codeopensrc/os-react-template)**  

### Contributing
- Feel free to [open issues on GitHub](https://github.com/codeopensrc/os-react-template/issues)
- Feel free to submit [pull requests on GitHub](https://github.com/codeopensrc/os-react-template/pulls)

### TODO Writeups
- Docker buildargs, tagging, and pushing
- Gitlab CI/CD. See `.gitlab-ci.yml`  
- Kubernetes. See `kube-deploy.sh` and `.gitlab-ci.yml` 
