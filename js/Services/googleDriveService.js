//Define the GoogleDriveController controller for Angular.
app.service('GoogleDriveService', ['$q','$http', function($q,$http) {
    var self = this;
    var URLs = {
        databaseFolderId: '0B5NVuDykezpkbUxvOUMyNnRsUGc',
        userSpreadsheetId: '1_ncCoG3lzplXNnSevTivR5bdJaunU2DOQOA0-KWXTU0',
    }

    //----------------------------------------------------
	//---------------- Initialization --------------------

    this.loadAPIs = function(APILoadedCallback) {
        gapi.client.load('drive', 'v3', function() {
            APILoadedCallback("drive");
        });
        gapi.client.load('sheets', 'v4', function() {
            APILoadedCallback("sheets");
        });
        gapi.load('picker', {
            'callback': function(){
              APILoadedCallback("picker")
            }
        });
    };

    this.getUserInfo = function() {
        return (gapi.client.drive.about.get({
            'fields': 'user(displayName,emailAddress,photoLink),appInstalled'
        }));
    };
    
    //----------------------------------------------------
	//----------------- Spreadsheets ---------------------

    this.getSpreadsheetRange = function(id, range) {
        return (gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: id,
            range: range,
        }));
    }

    this.updateSpreadsheetRange = function(id, range, dataToBeInserted, append) {
        if (append === true) {
            return (gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: URLs.userSpreadsheetId,
                range: range,
                valueInputOption: "USER_ENTERED",
                values: [dataToBeInserted],
            }));
        }
        else {
            return (gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: URLs.userSpreadsheetId,
                range: range,
                valueInputOption: "USER_ENTERED",
                values: dataToBeInserted,
            }));
        }
    }

    this.getWebsiteScreenshot = function(url) {
        return (gapi.client.request({
            'root': 'https://www.googleapis.com',
            'path': 'pagespeedonline/v2/runPagespeed?url=' + encodeURIComponent(url) + '&rule=AvoidLandingPageRedirects&screenshot=true&strategy=desktop&fields=screenshot(data%2Cheight%2Cwidth)&key=AIzaSyCFXAknC9Fza_lsQBlRCAJJZbzQGDYr6mo',
            'method': 'GET',
        }));
    }
    
    //----------------------------------------------------
	//----------------- Getting Files --------------------

    this.getListOfFlies = function(query, pageToken, pageSize) {
        var query = query || "";
        console.log("gettingFIles")
        return (gapi.client.drive.files.list({
            pageSize: pageSize,
            pageToken: pageToken,
            q: query,
            fields: 'files(name,id,modifiedTime,createdTime,properties,iconLink,thumbnailLink,description,starred,viewedByMe,owners(displayName,emailAddress),permissions(displayName,emailAddress)),nextPageToken', //
        }));
    };
    
    //----------------------------------------------------
	//---------------- Modifying Files -------------------

    this.deleteDriveFile = function(fileId) {
        return (gapi.client.drive.files.delete({
            'fileId': fileId
        }));
    };

    this.updateDriveFile = function(id, metadata) {
        return (gapi.client.drive.files.update({
            'fileId': id,
        }));
    };

    this.AppsScriptNewFile = function () {
        return $http({
            method: 'GET',
            url: 'https://script.google.com/macros/s/AKfycbwAVKcfa8Lzf_iyFlQpllMAn5kx0e37QSIKxsiE-51yYFOTDg0r/exec'
        });
    }

    this.createDriveFile = function(metadata) {
        metadata.parents = [URLs.databaseFolderId];
        return (gapi.client.drive.files.create(metadata));
    };

    this.getFileThumbnail = function(id) {
        return (gapi.client.drive.files.get({
            fileId: id,
            fields: 'name,thumbnailLink,iconLink', //
        }));
    }

    this.getFileContent = function(fileId) {
        return (gapi.client.drive.files.get({
            'fileId': fileId,
            'alt': 'media'
        }));
    };

    this.updateFlagged = function(id, value) {
        return (gapi.client.drive.files.update({
            'fileId': id,
            'resource': {
                properties: {
                    Flagged: value,
                },
            },
        }));
    };

    this.updateBookmarked = function(id, value) {
        return (gapi.client.drive.files.update({
            'fileId': id,
            'resource': {
                starred: value,
            },
        }));
    };

    this.updateFileMetadata = function(id, metadata) {
        return (gapi.client.drive.files.update({
            'fileId': id,
            'resource': metadata,
        }));
    };

    this.linkShareFile = function(fileID) {
        return (gapi.client.drive.permissions.create({
            fileId: fileID,
            type: "domain",
            role: 'reader',
            sendNotificationEmail: false,
        }));
    };
    // --not used functions--
}]);