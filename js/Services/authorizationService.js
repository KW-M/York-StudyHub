//Define the authorizationService service for Angular
app.service('authorizationService', ['GoogleDriveService', '$q', authService]);

//The function used in the authorizationService service also called by the google api framwork when it loads.
function authService(GoogleDriveService, $q) {
    var self = this;
    var client_id ='475444543746-e3r02g1o1o71kliuoohah04ojqbmo22e.apps.googleusercontent.com';
    var scopes =  ['https://www.googleapis.com/auth/drive']
    
    this.initilize = function(callback) {
        //gapi.client.setApiKey(apiKey);
    }
    
    this.buildAuthRequest = function(immediateMode) {
        var promise = $q.defer();
        var request = {
            hd: 'york.org',
            scope: ['https://www.googleapis.com/auth/drive'],
            client_id: CLIENT_ID,
            immediate: immediateMode,
        };
        gapi.auth.authorize(request, function(authResult) {
            if (authResult && !authResult.error) {
                promise.resolve(authResult);
                console.log('authorized');
            }
            else {
                promise.reject(authResult);
            }
        });
        return (promise.promise);
    };



    function isTokenValid() {
        var promiseVar = $q.defer();
        var token = gapi.auth.getToken();
        if (token && Date.now() < token.expires_at) {
            promiseVar.resolve();
        }
        else {
            gapi.auth.authorize(request);
        }
    }

    this.loginNoPopup = function() {
        return('halo');
    };


    this.loginPopup = function() {
        return( gapi.auth2.init({
            client_id: client_id,
            scope: scopes,
            hosted_domain: "york.org",
            immediate: false,
        }));
    };
}