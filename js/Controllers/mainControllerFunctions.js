/*global app*/ /*global angular*/ /*global gapi*/ /*global google*/ /*global queue*/ /*global subControllerFunctions*/
app.controller('ApplicationController', controllerFunction)
   //controllerFunction.$inject(['$scope', '$mdDialog', '$window', '$timeout', '$sce', '$mdSidenav', '$mdMedia', 'authorizationService', 'GoogleDriveService', '$q', '$location', 'angularGridInstance'])
function controllerFunction($scope, $rootScope, $filter, $mdDialog, $mdToast, $window, $http, $timeout, $sce, $mdSidenav, $mdMedia, authorizationService, GoogleDriveService, $q, $location, angularGridInstance) {
   var self = this;
   var content_container = document.getElementById("content_container");
   var layout_grid = document.getElementById("layout_grid");
   var loading_spinner = document.getElementById("loading_spinner");
   var no_more_footer = document.getElementById("no_more_footer");
   var no_posts_footer = document.getElementById("no_posts_footer");
   var footer_problem = document.getElementById("footer_problem");

   var drivePicker, uploadPicker;
   var getFileTimer = null;
   var conurancy_counter = 0;
   var performantScrollEnabled = false;

   $scope.allPosts = [];
   $scope.searchPosts = [];
   $scope.visiblePosts = [];

   var deDuplicationIndex = {};
   var classPageTokenSelectionIndex = {};

   $scope.previousSearch = undefined;
   $scope.searchPlaceholder = 'Search';

   $scope.userList = [];
   $scope.restorePost = false;
   $scope.globals = {
      sidenavIsOpen: true,
      FABisOpen: false,
      FABisHidden: true,
      addBarTopIsHidden: false,
      mobileSearchIsOpen: false,
   };

   $scope.queryPropertyString = '';
   $scope.queryParams = {
      q: undefined, //undefined to make search popunder show with no text in  field
      flagged: false,
      type: null,
      classpath: 'all-posts',
      creatorEmail: null,
      id: null,
   };

   $scope.$mdMedia = $mdMedia;
   $scope.$mdDialog = $mdDialog;
   $scope.$location = $location;
   $scope.$timeout = $timeout;

   //----------------------------------------------------
   //------------------- Routing ------------------------
   $scope.gotoRoute = function (query) {
      if (query.classPath) {
         $scope.toggleSidebar(true);
         $location.search({
            q: null
         });
         $location.path(query.classPath);
      } else {
         if (query.q === '') {
            $location.search({
               q: null
            });
         } else {
            $location.search({
               q: query.q || $scope.queryParams.q
            });
         }
      }
      $location.hash(query.id || null);
   };

   function listenForURLChange() {
      onLocationChange();
      $rootScope.$on('$locationChangeSuccess', function (event) {
         onLocationChange()
      });
   }

   function onLocationChange() {
      $scope.queryParams.q = $location.search().q || null;
      $scope.queryParams.classpath = $location.path().replace(/\//g, "") || 'all-posts';
      $scope.queryParams.id = $location.hash();

      $scope.searchInputTxt = $scope.queryParams.q;

      no_more_footer.style.display = 'none';
      no_posts_footer.style.display = 'none';
      footer_problem.style.display = 'none';

      if ($scope.queryParams.q !== null) {
         if ($scope.queryParams.q !== $scope.previousSearch) {
            $scope.updateVisiblePosts([]);
            $scope.previousSearch = $scope.queryParams.q
         }
      } else {
         $scope.queryParams.flagged = null
         $scope.queryParams.type = null
         $scope.queryParams.creatorEmail = null
      }
      if ($scope.queryParams.classpath === 'all-posts') {
         $scope.searchPlaceholder = 'Search'
         $scope.queryParams.flagged = false;
      } else if ($scope.queryParams.classpath === 'my-posts') {
         $scope.searchPlaceholder = 'Search My Posts'
         $scope.queryParams.creatorEmail = $scope.myInfo.Email;
      } else if ($scope.queryParams.classpath === 'flagged') {
         $scope.searchPlaceholder = 'Search Flagged Posts'
         $scope.queryParams.flagged = true
      } else {
         $scope.searchPlaceholder = 'Search Within ' + $scope.queryParams.classpath;
         $scope.queryParams.flagged = false
      }
      generateQueryString();
      if ($scope.queryParams.q === null) {
         $scope.updateVisiblePosts($scope.filterPosts($scope.allPosts), function () {
            hideSpinner();
         });
      }
      $scope.getFiles();
      getFileTimer = setInterval(function () {
         if (conurancy_counter == 0 && content_container.scrollHeight == content_container.clientHeight) {
            $scope.getFiles()
         }
      }, 1000)
   }

   //----------------------------------------------------
   //------------- Signin & Initiation ------------------
   gapi.load('client:auth2', function () {
      authorizationService.initilize(function () {
         GoogleDriveService.loadAPIs(initiateDrive);
      });
   });

   function initiateDrive(loaded) {
      console.log("API loaded: " + loaded)
      if (loaded === "drive") {
         queue('drive', GoogleDriveService.getUserInfo(), function (userInfo) {
            $scope.myInfo = {
               "Name": userInfo.result.user.displayName,
               "Email": userInfo.result.user.emailAddress,
               "ClassOf": userInfo.result.user.emailAddress.match(/\d+/)[0],
            };
            document.dispatchEvent(new window.Event('userInfoLoaded'));
         }, null, 150);
      }
      if (loaded === "sheets") {
         if ($scope.myInfo !== undefined) {
            handleUserPrefsSheet()
         } else {
            document.addEventListener('userInfoLoaded', function () {
               handleUserPrefsSheet();
            });
         }
      }
      if (loaded === "picker") {
         var docsView = new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(true).setParent("root");
         var sharedView = new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(true).setOwnedByMe(false);
         var uploadView = new google.picker.DocsUploadView().setParent("0B5NVuDykezpkUGd0LTRGc2hzM2s");
         drivePicker = new google.picker.PickerBuilder().
         addView(docsView).
         addView(sharedView).
         addView(uploadView).
         setDeveloperKey("AIzaSyCFXAknC9Fza_lsQBlRCAJJZbzQGDYr6mo").
         setOAuthToken(authorizationService.getAuthToken()).
         setCallback(self.pickerCallback).
         build();
         uploadPicker = new google.picker.PickerBuilder().
         enableFeature(google.picker.Feature.NAV_HIDDEN).
         hideTitleBar().
         addView(uploadView).
         setDeveloperKey("AIzaSyCFXAknC9Fza_lsQBlRCAJJZbzQGDYr6mo").
         setOAuthToken(authorizationService.getAuthToken()).
         setCallback(self.pickerCallback).
         build();
         if ($scope.myInfo !== undefined) {
            authorizationService.hideSigninDialog();
         } else {
            document.addEventListener('sheetPrefsLoaded', function () {
               authorizationService.hideSigninDialog();
            });
         }
      }
   }

   function handleUserPrefsSheet() {
      queue('sheets', GoogleDriveService.getSpreadsheetRange("Sheet1!A2:B"), function (response) {
         $scope.userList = response.result.values;
         for (var rowCount = 0; rowCount <= $scope.userList.length && rowCount > -1; rowCount++) {
            if ($scope.userList[rowCount] != undefined && $scope.userList[rowCount][0] == $scope.myInfo.Email) {
               $scope.UserSettingsRowNum = rowCount + 2 //+2 adjusts for header row
               getUserSettings('A' + (rowCount + 2) + ':' + (rowCount + 2));
               rowCount = -3 //signify that the user's Row has been found
            }
         }
         if (rowCount == $scope.userList.length + 1) {
            createUserSettings();
         }
      }, null, 2);

      function getUserSettings(range) {
         queue('sheets', GoogleDriveService.getSpreadsheetRange(range), function (response) {
            response.result.values[0][3]++
               $scope.convertRowToUserPreferences(response.result.values[0]);
            var event = new window.Event('sheetPrefsLoaded')
            document.dispatchEvent(event);
            queue('sheets', GoogleDriveService.updateSpreadsheetRange(range, response.result.values[0]), null, function (error) {
               console.log(error)
            }, 2);
         }, null, 2);
      }

      function createUserSettings() {
         var newData = [$scope.myInfo.Email, $scope.myInfo.Name, false, 1, 0, "", "", "", ""]
         queue('sheets', GoogleDriveService.appendSpreadsheetRange("Sheet1!A1:A", newData), function (newRow) {
            $scope.convertRowToUserPreferences(newData);
            var event = new window.Event('sheetPrefsLoaded')
            document.dispatchEvent(event);
         }, null, 2);
         $scope.convertRowToUserPreferences(newData);
      }

      listenForURLChange(); // this also Starts getting files
      queue('sheets', GoogleDriveService.getSpreadsheetRange("Sheet1!A2:Z", true), handleClassesSheet, null, 2)
   }

   function handleClassesSheet(rawClasses) {
      var classList = [];
      var classesResult = rawClasses.result.values
         //format the class list:
      for (var Catagory = 0; Catagory < classesResult.length; Catagory++) {
         classList[Catagory] = {
            'Catagory': classesResult[Catagory][0],
            'Color': classesResult[Catagory][1],
            'Classes': []
         }
         for (var Class = 2; Class < classesResult[Catagory].length; Class++) {
            classList[Catagory].Classes[Class - 2] = classesResult[Catagory][Class]
         }
      }
      $timeout(function () { //makes angular update values
         $scope.classList = classList;
      })
   }

   //----------------------------------------------------
   //--------------- Creating Posts ---------------------
   $scope.newPost = function (postObj, operation, event) {
      $mdDialog.show({
         templateUrl: '/directives/html/newPostContent.html',
         controller: ['$scope', '$timeout', '$http', '$mdDialog', 'GoogleDriveService', 'authorizationService', '$mdToast', "Post", "operation", newPostController],
         scope: $scope,
         parent: angular.element(document.body),
         preserveScope: true,
         locals: {
            Post: postObj,
            operation: operation
         },
         onComplete: function () {
            var newPostHeaderLink = document.getElementById("header_link");
            var newPostHeaderMetadata = document.getElementById("Metadata");
            var newPostHeaderImage = document.getElementById("header_image");
            var newPostHeaderTitle = document.getElementById("header_title");
            var newPostScroll = document.getElementsByClassName('new_post_dialog_scroll')[0];
            var newPostHeader = document.getElementById('dialog_header');
            newPostScroll.onscroll = function (event) {
               $scope.newPostScroll = newPostScroll.scrollTop;
               // if ($scope.operation == 'view' && $scope.Post.Link == '') {
               //    newPostHeader.style.height = "60px"
               //    if (scroll > 1) {
               //       newPostHeader.style.boxShadow = "0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12)"
               //    } else {
               //       newPostHeader.style.boxShadow = null
               //    }
               // } else {
               //    if (scroll <= 160) {
               //       newPostHeader.style.height = (200 - scroll) + "px"
               //       newPostHeaderLink.style.opacity = 1;
               //       newPostHeaderTitle.style.opacity = 0;
               //       newPostHeaderImage.style.top = -20 - (scroll / 5) + 'px';
               //    } else {
               //       newPostHeader.style.boxShadow = "0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12)"
               //       newPostHeader.style.height = "60px"
               //       newPostHeaderLink.style.opacity = 0;
               //       newPostHeaderTitle.style.opacity = 1;
               //    }
               // }
            }
         },
         clickOutsideToClose: false,
         fullscreen: ($mdMedia('xs')),
         // openFrom: {
         //    top: rect.top,
         //    left: rect.left,
         //    height: rect.height,
         //    width: rect.width,
         // },
         // closeTo: {
         //    top: rect.top,
         //    left: rect.left,
         //    height: rect.height,
         //    width: rect.width,
         // }//('#new_post_button'),
      }).then(function () {
         //done
      });
   };

   $scope.showPicker = function (type, restorePost) {
      $scope.restorePost = restorePost || false;
      if (type == "Drive") {
         drivePicker.setVisible(true);
      } else if (type == "Upload") {
         uploadPicker.setVisible(true);
      }
   };

   self.pickerCallback = function (data) {
      //drivePicker.dispose();
      if (data.action == google.picker.Action.PICKED) {
         console.log(data)
         if ($scope.restorePost == true) {
            $timeout(function () {
               $scope.Post.AttachmentId = data.docs[0].id;
               $scope.Post.Link = data.docs[0].url;
               $scope.Post.Title = $scope.Post.Title || data.docs[0].name;
            })
         } else {
            $scope.newPost({
               AttachmentId: data.docs[0].id,
               Link: data.docs[0].url,
               Title: data.docs[0].name,
            }, 'new');
         }
      }
   }

   //----------------------------------------------------
   //--------- loading and filtering posts --------------
   $scope.getFiles = function () {
      conurancy_counter++;
      var formattedFileList = [];
      var nextPageToken = classPageTokenSelectionIndex[$scope.queryPropertyString] || "";
      var queryString = $scope.queryPropertyString;
      if (nextPageToken !== "end") {
         loading_spinner.style.display = 'block';
         no_more_footer.style.display = 'none';
         no_posts_footer.style.display = 'none';
         footer_problem.style.display = 'none';
         queue('drive', GoogleDriveService.getListOfFlies($scope.queryPropertyString, nextPageToken, 3), function (fileList) {
            for (var fileCount = 0; fileCount < fileList.result.files.length; fileCount++) {
               if (!$scope.queryParams.q && deDuplicationIndex[fileList.result.files[fileCount].id] === undefined) {
                  //if the deDuplication obj doesn't have the file's id as a key, it hasn't already been downloaded.
                  formattedFileList[fileCount] = $scope.convertDriveToPost(fileList.result.files[fileCount]) //format and save the new post to the formatted files list array
                  deDuplicationIndex[fileList.result.files[fileCount].id] = 1; //mark this id as used with a "1".
               }
               if ($scope.queryParams.q) {
                  formattedFileList[fileCount] = $scope.convertDriveToPost(fileList.result.files[fileCount]) //format and save the new post to the formatted files list array
               }
            }
            sortPostsByType(formattedFileList, queryString);
            if (fileList.result.nextPageToken !== undefined) {
               classPageTokenSelectionIndex[$scope.queryPropertyString] = fileList.result.nextPageToken; //if we haven't reached the end of our search:
            } else {
               classPageTokenSelectionIndex[$scope.queryPropertyString] = "end" //if we have reached the end of our search:
            }
            hideSpinner();
         }, function () {
            no_more_footer.style.display = 'none';
            no_posts_footer.style.display = 'none';
            no_more_footer.style.display = 'none';
            footer_problem.style.display = 'flex';
            content_container.scrollTop = content_container.scrollHeight;
         }, 150);
      }
   }

   function hideSpinner() {
      if (classPageTokenSelectionIndex[$scope.queryPropertyString] === "end") {
         loading_spinner.style.display = 'none';
         clearInterval(getFileTimer);
         $timeout(function () {
            if ($scope.visiblePosts.length > 0) {
               no_more_footer.style.display = 'block';
            } else {
               layout_grid.style.height = '0px';
               no_posts_footer.style.display = 'block';
            }
         }, 200)
      }
      $timeout(function () {
         angularGridInstance.postsGrid.refresh();
      }, 1000)
   }

   function generateQueryString() {
      var query = "'0B5NVuDykezpkbUxvOUMyNnRsUGc' in parents and trashed = false"
      if ($scope.queryParams.flagged !== null && $scope.queryParams.flagged !== undefined) {
         query = query + " and properties has { key='Flagged' and value='" + $scope.queryParams.flagged + "' }";
      }
      if ($scope.queryParams.creatorEmail !== null && $scope.queryParams.creatorEmail !== undefined) {
         query = query + " and '" + $scope.queryParams.creatorEmail + "' in owners"
      }
      if ($scope.queryParams.type !== null && $scope.queryParams.type !== undefined) {
         query = query + " and properties has { key='Type' and value='" + $scope.queryParams.type + "' }"
      }
      if ($scope.queryParams.classpath !== null && $scope.queryParams.classpath !== undefined && $scope.queryParams.classpath !== 'my-posts' && $scope.queryParams.classpath !== 'all-posts' && $scope.queryParams.classpath !== 'flagged') {
         query = query + " and properties has { key='ClassName' and value='" + $scope.queryParams.classpath + "' }"
      }
      if ($scope.queryParams.q !== null && $scope.queryParams.q !== undefined) {
         query = query + " and fullText contains '" + $scope.queryParams.q + "'";
      }
      $scope.queryPropertyString = query;
   }

   function sortPostsByType(formattedFileList, queryString) {
      if ($scope.queryParams.q) {
         if ($scope.queryParams.q === $scope.previousSearch) {
            $scope.searchPosts = $scope.searchPosts.concat(formattedFileList);
         } else {
            $scope.searchPosts = formattedFileList;
         }
         $scope.previousSearch = $scope.queryParams.q
         $scope.updateVisiblePosts($scope.searchPosts);
      } else {
         $scope.allPosts = $scope.allPosts.concat(formattedFileList);
         if ($scope.queryPropertyString == queryString) {
            $scope.updateVisiblePosts($scope.visiblePosts.concat($scope.filterPosts(formattedFileList)));
         }
      }
      conurancy_counter = conurancy_counter - 1
   }

   //----------------------------------------------------
   //---------------- Event Watchers --------------------
   $scope.$watch('searchInputTxt', function (newValue) {
         if (newValue != $scope.queryParams.q) {
            $scope.gotoRoute({
               q: newValue
            })
         }
      })
      // The md-select directive eats keydown events for some quick select
      // logic. Since we have a search input here, we don't need that logic.
      // var selectSearchInput = angular.element(document.getElementById('class_select_input'))
      // selectSearchInput.on('keydown', function(ev) {
      //        ev.stopPropagation();
      //        console.log(ev)
      // });
   content_container.onscroll = function (event) {
      //called whenever the content_container scrolls
      // if (performantScrollEnabled === false && $scope.angularGridOptions.performantScroll === false) {
      //    $scope.angularGridOptions.performantScroll = true;
      //    performantScrollEnabled = true;
      // }
      var yScroll = content_container.scrollTop;
      $timeout(function () {
         if (yScroll >= 120 && $scope.globals.FABisHidden == true) {
            $scope.globals.FABisHidden = false;
         }
         if (yScroll <= 120 && $scope.globals.FABisHidden == false) {
            $scope.globals.FABisOpen = false;
            $scope.globals.FABisHidden = true;
         }
      })
   };
   window.addEventListener("resize", function () {
      $timeout(function () {
         if ($mdMedia('gt-sm')) {
            $mdSidenav('sidenav_overlay').close();
         }
      })
   });

   document.onkeydown = function (e) {
      if (e.altKey && e.ctrlKey && e.keyCode == 68) {
         devMode = !devMode
         $timeout(function () {
            $scope.devMode = devMode;
         })
      }
   }
   $scope.updateVisiblePosts = function (array, callback) {
         $timeout(function () {
            if (array) {
               $scope.visiblePosts = array;
            }
            if (callback) {
               callback();
            }
         })
      }
      //----------------------------------------------------
      //---------------------- dev -------------------------
   $scope.logDuplicationIndexes = function () {
      console.log({
         deDuplicationIndex: deDuplicationIndex,
         classPageTokenSelectionIndex: classPageTokenSelectionIndex
      })
   }

   //More (less important functions are delegated to another file);
   subControllerFunctions($scope, $location, $mdDialog, $mdToast, $mdMedia, $timeout, $filter, $mdSidenav, authorizationService, GoogleDriveService, angularGridInstance);
}
