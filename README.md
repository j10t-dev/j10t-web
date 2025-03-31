## Front end for lifts

Update: I don't like react but at least this works.


## Deploy instructions

Needs to be built on machine, rasp pi can't handle.

Copy over: `rsync -avz --exclude node_modules lifts-fe admin@pihost.local:/home/admin/opt`

Install on box, `npm run start` works. 

Docker also seems to work fine. 


## Install

`npm i`
`npm run build`
`npm run dev`

## To-do: 

* Add style / make less ugly
* Add other pages 
* Tests 

## Long term to eventually to-do
* Migrate to TypeScript 
