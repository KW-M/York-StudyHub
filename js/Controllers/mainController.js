app.controller('ApplicationController', ['$scope', '$mdDialog', '$window', '$mdSidenav', '$mdMedia', 'authorizationService', 'GoogleDriveService', function ($scope, $mdDialog, $window, $mdSidenav, $mdMedia, authorizationService, GoogleDriveService) {
    $scope.Posts = [];
    $scope.searchTerm = '';
    $scope.searchedPosts = [];
    $scope.globals = {
        FABisOpen: false,
        SidebarIsOpen: false //not used
    };

    $scope.signIn = function () { //called by the signIn button click
        loginProcedure(authorizationService.authorizePopup());
    };

    $scope.toggleSidebar = function () { //called by the top left toolbar menu button
        $mdSidenav('left').toggle();
    };

    $scope.helpDialog = function () { //called by the top right toolbar help button
        $mdDialog.show({
            templateUrl: 'templates/html/help.html',
            parent: angular.element(document.body),
            clickOutsideToClose: true,
            fullscreen: ($mdMedia('xs')),
        });
    };

    $scope.newPost = function () { //called by the bottom right plus/add resource button
        $mdDialog.show({
            templateUrl: 'templates/html/newPost.html',
            controller: ['$scope', '$mdDialog', 'GoogleDriveService', newPostController],
            parent: angular.element(document.body),
            clickOutsideToClose: false,
            fullscreen: ($mdMedia('xs')),
            openFrom: ('#new_post_button'),
            closeTo: {
                left: 1000,
            }
        });
    };

    function loginProcedure(response) {
        //handles the 'response' promise
        response.then(function (response) {
                $scope.loginStatus = response;
                GoogleDriveService.initiateAuthLoadDrive($scope.initiateDrive)
            }).catch(function (error) {
                if (error.error_subtype !== undefined && error.error_subtype === "access_denied") {
                    showLoginButton();
                } else if (error.error !== undefined && error.error === "access_denied") {
                    showLoginButton();
                } else {
                    console.log(error);
                }
            })
            //called to show the login button (& hide the loading spinner) 
        function showLoginButton() {
            $('#login_spinner').fadeOut(200,
                function () {
                    $('#auth_button').fadeIn(200);
                });
        };
    };

    $scope.initiateDrive = function () {
        GoogleDriveService.batchRequest().then(function (rawResponse) {
            // make a formatter to convert the http response aray into body array
            console.log(rawResponse);

            var arrayOfPosts = formatArrayResponse(rawResponse);
            $scope.Posts = arrayOfPosts;
            $scope.$apply();
        });
    }

    $window.pushPosts = function (response) {

    }

    $window.onscroll = function (event) { //called whenever the window scrolls
        var yScroll = $window.pageYOffset;
        if (yScroll >= 100) {
            $('#speed-dial-container').slideDown(300);
        } else {
            $('#speed-dial-container').slideUp(300);
        }
        $('#Masonry_Container').masonry({
            // options
            fitWidth: true,
            itemSelector: '.post-card',
            columnWidth: '.post-card',
        });
    };

    $window.formatResponse = function (rawResponse) {
        var formmatedResponse = JSON.parse(rawResponse.body);
        console.log(formmatedResponse);
        return (formmatedResponse)
    }

    $window.formatArrayResponse = function (rawArrayResponse) {
        var arrayOfPosts = [];
        for (response of rawArrayResponse) {
            arrayOfPosts.push(formatResponse(response));
        }
        return (arrayOfPosts)
    }

    $window.loginSilent = function (response) {
        loginProcedure(authorizationService.authorizeSilent());
    };
            }]);

//called by the google client api when it loads (must be outside the controller)
function gClientLoaded() {
    gapi.auth.init(loginSilent());
}