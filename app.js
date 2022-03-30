var express = require('express');
var bodyParser = require('body-parser')

var app = express();
// create application/json parser
var jsonParser = bodyParser.json()

const axios = require('axios');
require('dotenv').config()

async function authenticatePurview() {

    const params = new URLSearchParams()
    params.append('grant_type', 'client_credentials')
    params.append('client_id', process.env.AZURE_CLIENT_ID)
    params.append('client_secret', process.env.AZURE_CLIENT_SECRET)
    params.append('resource', 'https://purview.azure.net')
    
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }

    try {
        const resp = await axios.post('https://login.microsoftonline.com/' + process.env.AZURE_TENANT_ID + '/oauth2/token', params, config);
        //console.log(resp.data);
        return resp.data;
    } catch (err) {
        // Handle Error Here
        console.error(err);
    }
}

async function createLineage(access_token, input) {

    const config = {
        headers: { Authorization: `Bearer ${access_token}` }
    };

    const bodyParameters = {
        "entity": {
            "status": "ACTIVE",
            "version": 0,
            "typeName": "Process",
            "attributes": {
                "inputs": [
                    {"guid": input.guidSource}
                ],
                "outputs": [
                    {"guid": input.guidTarget}
                ],
                "qualifiedName": "apacheatlas://" + input.PipelineName,
                "name": input.PipelineDescription
            }
        }
    }
    
    try {
        //create new item
        const resp = await axios.post('https://' + process.env.ENDPOINT + '/api/atlas/v2/entity', bodyParameters, config);
        //console.log(resp.data);
        return resp.data;
    } catch (err) {
        // Handle Error Here
        console.error(err);
    }
}

async function deleteEntity(access_token, input) {

    const config = {
        headers: { Authorization: `Bearer ${access_token}` }
    };

    try {
        //find guid
        const guid = await axios.get('https://' + process.env.ENDPOINT + '/api/atlas/v2/entity/uniqueAttribute/type/azure_datalake_gen2_path?attr:qualifiedName=https://' + input.StorageAccount + '.blob.core.windows.net/' + input.Container + input.Folder, config);
        if (guid.data.entity.guid) {
            //delete by guid
            const deleteGuid = await axios.delete('https://' + process.env.ENDPOINT + '/api/atlas/v2/entity/guid/' + guid.data.entity.guid, config);
        }
    } catch (err) {
        // Handle Error Here
        console.error(err);
    }
}

async function createEntity(access_token, input) {

    const config = {
        headers: { Authorization: `Bearer ${access_token}` }
    };

    const bodyParameters = {
        "referredEntities": {},
        "entity": {
            "typeName": "azure_datalake_gen2_path",
            "attributes": {
                "owner": "ExampleOwner",
                "modifiedTime": 0,
                "createTime": 0,
                "qualifiedName": "https://" + input.StorageAccount + ".blob.core.windows.net/" + input.Container + input.Folder,
                "name": input.Description,
                "description": input.Description,
            },
            "contacts": {
            },
            "status": "ACTIVE",
            "createdBy": "ServiceAdmin",
            "updatedBy": "ServiceAdmin",
            "version": 0
        }
    }

    try {
        //create new item
        const resp = await axios.post('https://' + process.env.ENDPOINT + '/api/atlas/v2/entity', bodyParameters, config);
        return resp.data;
    } catch (err) {
        // Handle Error Here
        console.error(err);
    }
}

//route for GET: showing that the app is up and running
app.get('/', jsonParser, async (req, res) => {
    res.send('Purview nodejs lineage registration app is running!');
})

//route for POST: handling metadata registration
app.post('/', jsonParser, async (req, res) => {

    //map POST input to input array
    const input = { 
        SourceStorageAccount: req.body.SourceStorageAccount, 
        SourceContainer: req.body.SourceContainer, 
        SourceFolder: req.body.SourcePath,
        SourceFileType: req.body.SourceFileType,
        SourceDescription: req.body.FlowName,
        TargetStorageAccount: req.body.TargetStorageAccount, 
        TargetContainer: req.body.TargetContainer, 
        TargetFolder: req.body.TargetPath,
        TargetFileType: req.body.TargetFileType,
        TargetDescription: req.body.FlowName,
        PipelineName: req.body.PipelineName,
        PipelineDescription: req.body.PipelineDescription
    };

    //select input arguments for source
    inputSource = {
        StorageAccount: input.SourceStorageAccount,
        Container: input.SourceContainer,
        Folder: input.SourceFolder,
        FileType: input.SourceFileType,
        Description: input.SourceDescription
    }

    //select input arguments for target
    inputTarget = {
        StorageAccount: input.TargetStorageAccount,
        Container: input.TargetContainer,
        Folder: input.TargetFolder,
        FileType: input.TargetFileType,
        Description: input.TargetDescription
    }

    //authenticate to purview
    let success = await authenticatePurview();
    if (success) {
        let access_token = success.access_token;
        //delete existing entities
        await deleteEntity(access_token, inputSource);
        await deleteEntity(access_token, inputTarget);

        //create two arrays for the Entities, call createEntity twice, fetch GUIDs and create lineage
        let entitySource = await createEntity(access_token, inputSource);
        let entityTarget = await createEntity(access_token, inputTarget);
        guidSource = Object.values(entitySource.guidAssignments)[0];
        console.log("Created node object: " + guidSource);
        guidTarget = Object.values(entityTarget.guidAssignments)[0];
        console.log("Created node object: " + guidTarget);

        //create array for making lineage call
        inputLineage = {
            //lower case and replace spaces with dashes
            PipelineName: input.PipelineName.replace(/\s+/g, '-').toLowerCase(),
            PipelineDescription: input.PipelineDescription,
            guidSource: guidSource,
            guidTarget: guidTarget
        }

        //create lineage in purview
        let lineage = await createLineage(access_token, inputLineage);
        console.log("Created process object: " + Object.values(lineage.guidAssignments)[0]);

        //generate response message
        var response = {
            status  : 200,
            success : {
                "message": "Updated Successfully",
                "guidSource": guidSource,
                "guidTarget": guidTarget,
                "guidLineage": Object.values(lineage.guidAssignments)[0]
            }
        }
        
        //send response
        res.end(JSON.stringify(response));

    }
})

//start server on port 8080
var server = app.listen(8080, function () {
   var host = server.address().address
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
})