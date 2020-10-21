#!/bin/bash

which singularity
if [ $? = 0 ]; then
    # ssh -L3330:127.0.0.1:3330 robertft@cubic-login
    # cp /cbica/projects/insurance/db/layout_index.sqlite ~/test.sqlite
    SINGULARITYENV_PORT=3330 singularity run --cleanenv --writable-tmpfs --containall --pwd /usr/src/app \
    -B ~/test.sqlite:/usr/src/data/db.sqlite \
    -B /cbica/projects/insurance/jpg:/usr/src/data/images \
    -B ~/repos/qcbids/web/app.js:/usr/src/app/app.js \
    -B ~/repos/qcbids/web/html/index.js:/usr/src/app/html/index.js \
    /cbica/home/robertft/simg/qcbids_latest.sif
    # note the final 2 bind mounts are for development
else
    docker run -p 3000:3200 -e PORT=3200 -d --name qcbids \
    -v $PWD/../var/test.sqlite:/usr/src/data/db.sqlite \
    -v $PWD/../var/jpg_mount:/usr/src/data/images \
    pennsive/qcbids
fi
