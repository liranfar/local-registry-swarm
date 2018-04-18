# Local Registry Server for Docker Swarm
Current [Getting-Started] Docker documentation is depended on the public docker hub rather than local so here I describe the whole process to configure swarm pulling images from your own local registry.

[Getting-Started]:https://docs.docker.com/get-started/

## Resources

- [Dots and Brackets : Code Blog](https://codeblog.dotsandbrackets.com/private-registry-swarm/)

- [Official Docs](https://docs.docker.com/registry/deploying/)


## Steps

1. Create machines for a swarm:
  * `docker-machine create master`
  * `docker-machine create worker-1`
  * `docker-machine create worker-2`

    * and so on..

  2. Init swarm on `master` and join workers:

    * Assuming `master` ip is 192.168.99.100
      ```
      docker-machine ssh master \
      docker swarm init --advertise-addr 192.168.99.100
      ```
    * copy the output from `init` command and run it using`ssh` to **each** worker as follows:
    ```
    docker-machine worker-1 \
  	ssh <the output from init swarm>
    ```
  3. Install visualizer in `master` ( not a must but highly recommended )

    * run
  `
  eval $(docker-machine env master)
  `
  in order to connect to Docker Engine in `master`.

   * deploy visualization service:
   ```
   docker service create \
   --name=viz \
	 --publish=8080:8080 \
	 --constraint=node.role==manager \
	 --mount=type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
	 --detach=true \
	 dockersamples/visualizer
   ```

  4. Generate self-signed certificate

    * run
    ```
    openssl req -newkey rsa:4096 -nodes -sha256 \
    -keyout registry.key -x509 -days 365 \
    -out registry.crt
    ```
    * You can safely ignore the questions afterwards **except** the   Common-Name. Type any local URL you wish, in this example it is going to be
    ```
    myregistry.com
    ```

  5. Force Docker to trust self-signed certificate

    * Copy registry.crt file to `master` :

      `docker-machine scp registry.crt master:/home/docker/`

    * Create a folder for the certificate on **each** machine in the swarm :

      `docker-machine ssh <machine_name> sudo mkdir -p /etc/docker/certs.d/myregistry.com:5000`

    * rename `registry.crt` to  `ca.crt` and move in into the underline folder :

      `docker-machine ssh <machine_name> sudo mv /home/docker/registry.crt /etc/docker/certs.d/myregistry.com:5000/ca.crt`

    * All together :
    ```
    docker-machine scp registry.crt master:/home/docker/ && \
    docker-machine ssh <machine_name> sudo mkdir -p /etc/docker/certs.d/myregistry.com:5000 && \
    docker-machine ssh <machine_name> sudo mv /home/docker/registry.crt /etc/docker/certs.d/myregistry.com:5000/ca.crt
    ```

  6. Configure local DNS on /etc/hosts to recognize `myregistry.com` on **each** machine in the swarm :

  * Assuming 192.168.99.100 is the master ip, run
      ```
      docker-machine ssh <machine_name>
      sudo sh -c "echo ' 192.168.99.100 myregistry.com' >> /etc/hosts"
      exit
      ```

  7. Copy the generated certificate to `master` :
  ```
  docker-machine scp registry.crt master:/home/docker/ && \
  docker-machine scp registry.key master:/home/docker/
  ```

  8. Create the registry service on `master` :
  ```
  docker service create --name registry --publish=5000:5000 \
  --constraint=node.role==manager\
  --mount=type=bind,src=/home/docker,dst=/certs \
  -e REGISTRY_HTTP_ADDR=0.0.0.0:5000 \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/registry.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/registry.key \
  registry:latest
  ```
  Make sure the service appears on the visualizer ( browser 192.168.99.100:8080 )

  9. Build your own image with `myregistry.com:5000/<repository>:<tag>` format. For example :

  `docker build . -t myregistry.com:5000/server:latest`

  10. Push your built image :

    `docker push myregistry.com:5000/server:latest`

  11. Check your repo :
    `curl -k -X GET https://myregistry.com:5000/v2/_catalog`

  12. Create, run and scale your service :
  ```
  docker service create --name=node-server myregistry.com:5000/server
  docker service scale node-server=3
  ```
  13. Notice for any change on the visualizer and you will see the new added services distributed on all nodes.


**That's it :)**
