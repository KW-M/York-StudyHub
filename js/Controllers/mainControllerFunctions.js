/*global app*/ /*global angular*/ /*global gapi*/ /*global google*/ /*global queue*/ /*global subControllerFunctions*/
app.controller('AppController', controllerFunction)
   //controllerFunction.$inject(['$scope', '$mdDialog', '$window', '$timeout', '$sce', '$mdSidenav', '$mdMedia', 'authorizationService', 'GoogleDriveService', '$q', '$location', 'angularGridInstance'])
function controllerFunction($scope, $rootScope, $window, $timeout, $filter, $q, $location, $http, $sce, $mdDialog, $mdToast, $mdSidenav, $mdMedia, $mdTheming, authorizationService, APIService, angularGridInstance) {
   var content_container = document.getElementById("content_container");
   var self = this;

   $scope.allLabels = [];
   $scope.visibleLabels = [];
   $scope.labelSearch = null;

   $scope.restorePost = false;
   $scope.globals = {
      sidenavIsOpen: true,
      FABisOpen: false,
      FABisHidden: true,
      addBarTopIsHidden: false,
      mobileSearchIsOpen: false,
   };

   $scope.$mdMedia = $mdMedia;
   $scope.$mdDialog = $mdDialog;
   $scope.$location = $location;
   $scope.$timeout = $timeout;

   //----------------------------------------------------
   //------------------- Routing ------------------------
   $scope.queryParams = {
      q: undefined, //undefined to make search popunder show with no text in  field
      flagged: false,
      type: null,
      classPath: 'Loading...',
      creatorEmail: null,
      id: null,
   };
   $scope.searchPlaceholder = 'Search';

   $scope.gotoRoute = function (query) {
      if (query.classPath !== undefined) {
         $scope.toggleSidebar(true);
         $location.search({
            q: null
         });
         $location.path(query.classPath.replace(/-/g, "~").replace(/ /g, "-") || query.classPath);
      }
      if (query.q !== undefined) {
         if (query.q === null || query.q == '') {
            $location.search({
               q: null
            });
         } else {
            $location.search({
               q: query.q || $scope.queryParams.q
            });
         }
      }
      //$location.hash(query.id || null);
   };

   function listenForURLChange() {
      onLocationChange();
      $rootScope.$on('$locationChangeSuccess', onLocationChange);

      function onLocationChange() {
         $scope.queryParams.q = $location.search().q || null;
         $scope.queryParams.classPath = $location.path().replace(/\//g, "").replace(/-/g, " ").replace(/~/g, "-") || 'All Posts';
         $scope.queryParams.id = $location.hash();
         $scope.searchInputTxt = $scope.queryParams.q;

         no_more_footer.style.display = 'none';
         no_posts_footer.style.display = 'none';
         footer_problem.style.display = 'none';
         $scope.searchPrefix = 'Search';
         if ($scope.queryParams.q !== null) {
            if ($scope.queryParams.q != $scope.previousSearch) {
               updateSortedPosts([]);
            }
         } else {
            $scope.queryParams.flagged = null
            $scope.queryParams.type = null
            $scope.queryParams.creatorEmail = null
         }
         if ($scope.queryParams.classPath === 'All Posts') {
            $scope.queryParams.flagged = false;
         } else if ($scope.queryParams.classPath === 'Your Posts') {
            $scope.queryParams.creatorEmail = $scope.myInfo.Email;
         } else if ($scope.queryParams.classPath === 'Flagged Posts') {
            $scope.queryParams.flagged = true
         } else {
            $scope.searchPrefix = 'Search Within';
            $scope.queryParams.flagged = false
         }
         // generateQueryString();
         // if ($scope.queryParams.q === null) {
         //$scope.updateVisiblePosts($scope.filterPosts($scope.allPosts), hideSpinner);
         // }
         $scope.selectedClass = $scope.findClassObject($scope.queryParams.classPath);
         $timeout(function () {
            $scope.selectedClass = $scope.selectedClass
         });
         getFileTimer = setInterval(function () {
            console.log(conurancyCounter)
            if (conurancyCounter == 0 && content_container.scrollHeight == content_container.clientHeight) $scope.loadPosts()
         }, 1000);
         postsFullyLoaded = false;
         if ($scope.allPosts.length != 0) sortPosts();
      }
   }

   if (window.location.search) {
      var unformated = window.location.search.match(/state=([^&]+)(?:$|&)/)
      var shareInput = JSON.parse(decodeURIComponent(unformated[1]));
      if (shareInput.exportIds) {
         var id = shareInput.exportIds[0]
      } else if (shareInput.ids) {
         var id = shareInput.ids[0]
      }
      $scope.newPost({
         Link: 'https://drive.google.com/?open=' + id
      }, 'new')
   }

   //----------------------------------------------------
   //------------- Signin & Initiation ------------------
   var drivePicker, uploadPicker;
   var labelList, teacherList;

   authorizationService.onLoad(function () {
      var profile = authorizationService.GUser.getBasicProfile()
      $scope.myInfo = {
         email: profile.getEmail(),
         name: profile.getName(),
         profilePicture: profile.getImageUrl(),
      }

      var getStartupData = APIService.runGAScript('getStartupData')().then(function (data) {
         var dataObj = JSON.parse(data.result.response.result);
         console.log(dataObj)
         $timeout(function () {
            for (var property in dataObj.userPrefs) {
               $scope.myInfo[property] = dataObj.userPrefs[property];
            }
            $scope.myInfo.staredClasses.push({
               name: 'Other',
               color: 'hsla(200, 70%, 75%,',
            })
            labelList = dataObj.labels;
            teacherList = dataObj.teachers;
            $scope.classList = dataObj.classes;
            $scope.sortedLabels = $scope.sortLabels(labelList.concat(teacherList))
         });
      }, console.warn)

      var pickerPromise = $q.defer();
      gapi.load('picker', {
         'callback': function () {
            initiateDrivePicker();
            pickerPromise.resolve();
         }
      })

      $q.all([getStartupData, pickerPromise]).then(function () {
         console.log("Everything Loaded")
         listenForURLChange();
         getDatabase();
         authorizationService.hideSigninDialog();
      })
   })

   function initiateDrivePicker() {
      var uploadView = new google.picker.DocsUploadView().setParent("0B5NVuDykezpkUGd0LTRGc2hzM2s");
      var docsView = new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(true).setParent("root");
      var sharedView = new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(true).setOwnedByMe(false);
      var recentsView = new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(false).setSelectFolderEnabled(true).setLabel('Recents');

      drivePicker = new google.picker.PickerBuilder().setDeveloperKey("AIzaSyAhXIGkYgfAG9LXhAuwbePD3z_qSVWUSNA").setOrigin(window.location.protocol + '//' + window.location.host).setOAuthToken(authorizationService.getGAuthToken()).setCallback(drivePickerCallback)
         .addView(docsView).addView(recentsView).addView(sharedView).build();
      uploadPicker = new google.picker.PickerBuilder().setDeveloperKey("AIzaSyAhXIGkYgfAG9LXhAuwbePD3z_qSVWUSNA").setOrigin(window.location.protocol + '//' + window.location.host).setOAuthToken(authorizationService.getGAuthToken()).setCallback(drivePickerCallback)
         .addView(uploadView).enableFeature(google.picker.Feature.NAV_HIDDEN).hideTitleBar().build();
   }

   function getDatabase() {
      var postsFireRef = authorizationService.FireDatabase.ref('posts')
      postsFireRef.orderByChild('DC').once('value', function (snapshot) {
         snapshot.forEach(function (childSnapshot) {
            $scope.allPosts.push(convertFirePost(childSnapshot.key, childSnapshot.val(), 'notLoaded'))
         });
         postsFireRef.orderByChild('DC').startAt(Date.now()).on('child_added', function (childSnapshot) {
            console.log('newChild', childSnapshot.val())
            $scope.allPosts.push(convertFirePost(childSnapshot.key, childSnapshot.val(), 'notLoaded'));
            getPosts([childSnapshot.key], sortPosts)
         });
         postsFireRef.on('child_removed', function (childSnapshot) {
            console.log('childremoved', childSnapshot)
            var indexes = getIdIndexInPostArrays(childSnapshot.key);
            $timeout(function () {
               $scope.allPosts.splice(indexes.allPosts, 1);
               $scope.sortedPosts.splice(indexes.sortedPosts, 1);
            })
         });
         postsFireRef.on('child_changed', function (childSnapshot) {
            console.log(childSnapshot)
            var indexes = getIdIndexInPostArrays(childSnapshot.key)
            var oldPost = $scope.allPosts[indexes.allPosts]
            var newSlimPost = convertFirePost(childSnapshot.key, childSnapshot.val(), 'Loaded')
            var mergedFullPost = mergeFirebasePost(oldPost, newSlimPost);
            //if (newSlimPost.updateDate != oldPost.updateDate) mergedFullPost.loadStatus = 'Changed';
            $timeout(function () {
               $scope.allPosts[indexes.allPosts] = mergedFullPost;
               $scope.sortedPosts[indexes.sortedPosts] = mergedFullPost;
            })
            sortPosts()
         });
         if ($scope.sortedPosts.length != 0) loadPosts();
         if ($scope.sortedPosts.length == 0) sortPosts();
         console.log($scope.allPosts);
      })

      function convertFirePost(key, value, loadStatus) {
         return {
            id: key,
            creator: {
               email: value.E,
               classOf: (value.E.match(/\d+/) || ['∞'])[0]
            },
            labels: value.L,
            flagged: value.F,
            teachers: value.T,
            likeCount: value.LC,
            updateDate: new Date(value.DU),
            creationDate: new Date(value.DC),
            class: $scope.findClassObject(value.C),
            loadStatus: loadStatus,
         }
      }
   }

   //----------------------------------------------------
   //----------- Loading and Sorting Posts --------------
   var postsFullyLoaded = false;
   var conurancyCounter = 0;
   var getFileTimer = null;

   $scope.allPosts = [];
   $scope.sortedPosts = [];
   $scope.searchPosts = [];

   function sortPosts() {
      hideSpinner(false)
      var filterObj = filterPosts($scope.allPosts)
      $scope.sortedPosts = filterObj.filtered.sort(function (a, b) {
         console.log(b)
         var alikes = (a.likes != undefined ? a.likes.length : a.likeCount) * 2
         var blikes = (b.likes != undefined ? b.likes.length : b.likeCount) * 2
         return b.creationDate.addDays(blikes) - a.creationDate.addDays(alikes);
      })
      filterObj.filteredOut.forEach(function (postObj) {
         if (postObj.loadStatus == 'Loaded') {
            var slimedObj = {
               id: postObj.id,
               title: postObj.title,
               class: postObj.class,
               creator: postObj.creator,
               flagged: postObj.flagged,
               likeCount: postObj.likes.length,
               updateDate: postObj.updateDate,
               creationDate: postObj.creationDate,
               loadStatus: 'UnLoaded',
            }
            var indexes = getIdIndexInPostArrays(postObj.id)
            $scope.allPosts[indexes.allPosts] = slimedObj;
            $scope.sortedPosts[indexes.sortedPosts] = slimedObj;
         }
      })
      loadPosts()

      function filterPosts(inputSet) {
         var filtered = [];
         var filteredOut = [];
         var max = inputSet.length;
         for (var count = 0; count < max; count++) {
            if ($scope.queryParams.flagged !== null && $scope.queryParams.flagged !== undefined) {
               var Flagged = inputSet[count].flagged === $scope.queryParams.flagged;
            } else {
               var Flagged = true;
            }
            if ($scope.queryParams.classPath !== null && $scope.queryParams.classPath !== undefined && $scope.selectedClass !== false && $scope.selectedClass.stared !== null) {
               var Class = inputSet[count].class.name === $scope.queryParams.classPath;
            } else {
               var Class = inputSet[count].class.name !== 'Memes';
            }
            if ($scope.queryParams.type !== null && $scope.queryParams.type !== undefined) {
               var Type = inputSet[count].type === $scope.queryParams.type;
            } else {
               var Type = true;
            }
            if ($scope.queryParams.creatorEmail !== null && $scope.queryParams.creatorEmail !== undefined) {
               var Creator = inputSet[count].creator.email === $scope.queryParams.creatorEmail;
            } else {
               var Creator = true;
            }
            if (Flagged && Class && Type && Creator) {
               filtered.push(inputSet[count])
            } else {
               filteredOut.push(inputSet[count])
            }
         };
         return {
            filtered: filtered,
            filteredOut: filteredOut
         };
      }
   }

   function loadPosts() {
      if (!postsFullyLoaded) {
         hideSpinner(false);
         var index, cancel;
         var postIdAccumulator = [];
         var max = $scope.sortedPosts.length
         for (index = 0; index < max; index++) {
            var postObj = $scope.sortedPosts[index];
            if (postObj.loadStatus != 'Loaded') {
               postIdAccumulator.push(postObj.id)
               if (postIdAccumulator.length == 3) {
                  if (index == max) {
                     postsFullyLoaded = true;
                     getPosts(postIdAccumulator, true)
                  } else {
                     postsFullyLoaded = false;
                     getPosts(postIdAccumulator, false);
                  }
                  return true;
               }
            }
         }
         if (postIdAccumulator.length != 0 && index == max) {
            getPosts(postIdAccumulator)
            postsFullyLoaded = true;
         } else if (max == 0) {
            hideSpinner(true)
            postsFullyLoaded = true;
         };
      }
   }

   function getPosts(idArray, callBack) {
      console.log(idArray)
      conurancyCounter = conurancyCounter + 1;
      promiseQueue().addPromise('script', APIService.runGAScript('getPosts', idArray, false), function (postsData) {
         conurancyCounter = conurancyCounter - 1;
         console.log(conurancyCounter)
         console.log(postsData)
         var postsArray = JSON.parse(postsData.result.response.result);
         postsArray.forEach(function (fullPost) {
            fullPost.loadStatus = 'Loaded';
            var indexes = getIdIndexInPostArrays(fullPost.id)
            mergeFirebasePost(fullPost, $scope.allPosts[indexes.allPosts])
            $timeout(function () {
               $scope.allPosts[indexes.allPosts] = fullPost;
               $scope.sortedPosts[indexes.sortedPosts] = fullPost;
               if (callBack) callBack();
            })
         })
         hideSpinner(true);
      }, console.warn, 150);
   }

   function hideSpinner(hide) {
      console.warn('Hide:' + hide + 'length' + $scope.sortedPosts.length + 'fullLoad' + postsFullyLoaded)
      if (hide == true) {
         loading_spinner.style.display = 'none';
         clearInterval(getFileTimer);
         if ($scope.sortedPosts.length == 0) {
            layout_grid.style.height = '0px';
            no_posts_footer.style.display = 'block';
         } else if (postsFullyLoaded == true) {
            no_more_footer.style.display = 'block';
         }
      } else {
         loading_spinner.style.display = 'block';
         no_posts_footer.style.display = 'none';
         no_more_footer.style.display = 'none';
         footer_problem.style.display = 'none';
      }
   }

   // $scope.$watch('sortedPosts', function () {
   //    var visible = [];
   //    var max = $scope.sortedPosts.length
   //    for (var index = 0; index < max; index++) {
   //       var postObj = $scope.sortedPosts[index]
   //       if (postObj.loadStatus == 'Loaded') visible.push(postObj);
   //    }
   //    $timeout(function () {
   //       $scope.visiblePosts = visible;
   //       angularGridInstance.postsGrid.refresh();
   //       if ($scope.visiblePosts.length == 0) layout_grid.style.height = '0px';
   //    })
   // }, true);

   $scope.loadPosts = loadPosts;

   //----------------------------------------------------
   //--------------- Creating Posts ---------------------
   var layout_grid = document.getElementById("layout_grid");
   var footer_problem = document.getElementById("footer_problem");
   var no_more_footer = document.getElementById("no_more_footer");
   var no_posts_footer = document.getElementById("no_posts_footer");
   var loading_spinner = document.getElementById("loading_spinner");

   function newPost(postObj, operation, event) {
      $scope.newPostScroll = 0;
      var dialogConfig = {
            templateUrl: 'templates/createPost.html',
            controller: ['$scope', '$timeout', '$http', '$mdDialog', 'APIService', 'authorizationService', '$mdToast', "postObj", "operation", newPostController],
            locals: {
               postObj: postObj,
               operation: operation
            },
            scope: $scope,
            preserveScope: true,
            onComplete: onDialogLoaded,
            clickOutsideToClose: false,
            fullscreen: $mdMedia('xs'),
            parent: angular.element(document.body),
         }
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

      $mdDialog.show(dialogConfig).then(function () {
         //done
      });

      function onDialogLoaded() {
         $scope.dialog_container = document.getElementsByClassName('md-dialog-container')[0]
         var newPostScroll = document.getElementsByClassName('new_post_dialog_scroll')[0];
         var newPostHeaderImage = document.getElementById("header_image");
         var newPostHeader = document.getElementById('dialog_header');
         newPostScroll.style.opacity = 1;
         newPostScroll.onscroll = function () {
            if (newPostScroll.scrollTop < 141) {
               $timeout(function () {
                  $scope.newPostScroll = newPostScroll.scrollTop;
               })
               newPostHeaderImage.style.top = -20 - (newPostScroll.scrollTop / 5) + 'px';
            } else {
               $timeout(function () {
                  $scope.newPostScroll = 140;
               })
            }
         }

         // The md-select directive eats keydown events for some quick select logic.
         // Since we have a search input in the course selector, we don 't need that logic.
         var selectSearchInput = angular.element(document.getElementById('class_select_input'))
         selectSearchInput.on('keydown', function (ev) {
            ev.stopPropagation();
         });
      }
   };

   function showDrivePicker(type, restorePost) {
      $scope.restorePost = restorePost || false;
      if (type == "Drive") {
         drivePicker.setVisible(true);
      } else if (type == "Upload") {
         uploadPicker.setVisible(true);
      }
   };

   function drivePickerCallback(data) {
      if (data.action == google.picker.Action.PICKED) {
         if ($scope.restorePost == true) {
            $timeout(function () {
               $scope.post.attachmentId = data.docs[0].id;
               $scope.post.link = data.docs[0].url;
               $scope.post.title = $scope.post.title || data.docs[0].name;
            })
         } else {
            $scope.newPost({
               attachmentId: data.docs[0].id,
               link: data.docs[0].url,
               title: data.docs[0].name,
            }, 'new');
         }
      }
   }

   $scope.newPost = newPost;
   $scope.showDrivePicker = showDrivePicker;

   //----------------------------------------------------
   //------------------ Searching -----------------------
   var queryPropertyString = '';
   var previousSearch = undefined;

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
      if ($scope.queryParams.classPath !== null && $scope.queryParams.classPath !== undefined && $scope.queryParams.classPath !== 'Your Posts' && $scope.queryParams.classPath !== 'All Posts' && $scope.queryParams.classPath !== 'Flagged Posts') {
         query = query + " and properties has { key='ClassName' and value='" + $scope.queryParams.classPath + "' }"
      }
      if ($scope.queryParams.q !== null && $scope.queryParams.q !== undefined) {
         query = query + " and fullText contains '" + $scope.queryParams.q + "'";
      }
      $scope.queryPropertyString = query;
   }
   $scope.$watch('searchInputTxt', function (newValue) {
      var input = newValue || null
      var query = $scope.queryParams.q || null;
      if (input != query) $scope.gotoRoute({
         q: input
      })
   }, false);

   //----------------------------------------------------
   //-------------- Filtering & Sorting -----------------
   $scope.findClassObject = function (className) {
      if (className == 'All Posts') {
         return ({
            name: 'All Posts',
            color: 'hsla(200, 70%, 75%,',
            catagory: null,
            rules: null,
            stared: null,
         })
      } else if (className == 'Your Posts') {
         return ({
            name: 'Your Posts',
            color: 'hsla(114, 89%, 42%,',
            catagory: null,
            rules: null,
            stared: null,
         })
      } else if (className == 'Flagged Posts') {
         return ({
            name: 'Flagged Posts',
            color: 'hsla(15, 95%, 65%,',
            catagory: null,
            rules: null,
            stared: null,
         })
      } else if (className == 'Quizlet') {
         return ({
            name: 'Quizlet',
            color: 'hsla(229, 46%, 49%,',
            catagory: null,
            rules: null,
            stared: null,
         })
      } else if (className == 'Memes') {
         return ({
            name: 'Memes',
            color: 'hsla(200, 70%, 75%,',
            catagory: null,
            rules: 'What da heck are you doing here??',
            stared: false,
         })
      } else if (className == 'Other') {
         return ({
            name: 'Other',
            color: 'hsla(200, 70%, 75%,',
            catagory: null,
            rules: null,
            stared: null,
         })
      } else {
         for (var Catagories = 0; Catagories < $scope.classList.length; Catagories++) {
            for (var ClassNum = 0; ClassNum < $scope.classList[Catagories].classes.length; ClassNum++) {
               var Class = $scope.classList[Catagories].classes[ClassNum]
               if (Class.name == className) {
                  Class.color = $scope.classList[Catagories].color
                  Class.catagory = $scope.classList[Catagories].catagory
                  for (var StaredNum = 0; StaredNum < $scope.myInfo.staredClasses.length; StaredNum++) {
                     if ($scope.myInfo.staredClasses[StaredNum].name == className) {
                        Class.stared = true;
                        return (Class)
                     }
                  }
                  Class.stared = false;
                  return (Class)
               }
            }
         }
      }
      return false
      console.warn('could not find class: ' + className);
   };
   $scope.sortLabels = function (input) {
      if ($scope.sortedLabels && $scope.post && $scope.post.class && $scope.post.class.name != '') {
         var max = $scope.sortedLabels.length
         for (var labelCount = 0; labelCount < max; labelCount++) {
            var label = $scope.sortedLabels[labelCount];
            var classMax = label.classes.length;
            for (var classCount = 0; classCount < classMax; classCount++) {
               var labelClass = label.classes[classCount]
               if (labelClass == $scope.post.class.name || labelClass.name == $scope.post.class.name) {
                  if (label.type == 'Label') label.sortOrder = (labelClass.usage * 2) + 1000
                  if (label.type == 'Teacher') label.sortOrder = 100000;
                  classCount = classMax + 1;
               };
               if (classCount != classMax + 1) label.sortOrder = label.totalUsage || 1
            }
         }
      } else {
         $scope.sortedLabels = input || labelList.concat(teacherList);
      }
      $scope.sortedLabels = $scope.sortedLabels.sort(function (a, b) {
         return (b.sortOrder || b.totalUsage || 1) - (a.sortOrder || a.totalUsage || 1);
      })
      console.log($scope.sortedLabels)
      return ($scope.sortedLabels)
   };

   //----------------------------------------------------
   //------------------UI Actions------------------------
   $scope.signOut = function () {
      authorizationService.handleSignoutClick();
   };
   $scope.FABClick = function () { //called by the top left toolbar menu button
      if ($scope.globals.FABisOpen == true) {
         $scope.newPost({}, 'new')
      }

   };
   $scope.toggleSidebar = function (close) { //called by the top left toolbar menu button
      if (close === true) {
         $mdSidenav('sidenav_overlay').close();
      } else {
         if ($mdMedia('gt-sm')) {
            $scope.globals.sidenavIsOpen = !$scope.globals.sidenavIsOpen;
         } else {
            $mdSidenav('sidenav_overlay').toggle();
         }
      }
   };
   $scope.toggleMobileSearch = function (toOpen) {
      $timeout(function () {
         $scope.globals.mobileSearchIsOpen = toOpen;
         $scope.searchInputTxt = '';
      })
      if (toOpen == true) {
         document.getElementById("mobile_search_input").focus();
      } else {
         document.getElementById("mobile_search_input").blur();
      }
   }
   $scope.toggleSidenavClassSearch = function (toOpen) {
      $timeout(function () {
         $scope.globals.sideNavClassSearchOpen = toOpen;
         $scope.sideNavClassSearch = '';
      })
      if (toOpen == true) {
         document.getElementById("sidenav_class_search_input").focus();
      } else {
         document.getElementById("sidenav_class_search_input").blur();
      }
   }
   $scope.openQuizletWindow = function (argument) {
      var quizWindow = window.open("", "_blank", "status=no,menubar=no,toolbar=no");
      quizWindow.resizeTo(9000, 140)
      quizWindow.moveTo(0, 0);
      quizWindow.document.write("<div style='display:flex;align-items: center;height: 100%;'><span>Your Quizlet username should be here.</span><div style='flex:1;height: 2px;margin-left: 5px;background:black;'></div><div style=' width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-left: 10px solid; '></div><div style=' width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-left: 10px solid; margin-right: 160px; '></div></div>");
      setTimeout(function () {
         quizWindow.location = "https://quizlet.com"
      }, 3000);
   }

   //----------------------------------------------------
   // --------------- Post Card Functions ---------------
   var likeClickTimer = {}
   $scope.confirmDelete = function (content, arrayIndex) {
      var confirm = $mdDialog.confirm().title('Permanently delete this?').ariaLabel('Delete?').ok('Delete').cancel('Cancel');
      $mdDialog.show(confirm).then(function () {
         promiseQueue().addPromise('script', APIService.runGAScript('deletePost', content.id, false), function (returnedValue) {
            console.log(returnedValue.result.response.result)
            if (returnedValue.result.response.result == true) authorizationService.FireDatabase.ref('posts/' + content.id).remove().then(null, console.warn)
         }, console.warn, 150);
      });
   };
   // $scope.flagPost = function (content, arrayIndex) {
   //    content.Flagged = true;
   //    if ($scope.queryParams.classPath != 'flagged') {
   //       $timeout(function () { //makes angular update values
   //          $scope.visiblePosts.splice(arrayIndex, 1);
   //       });
   //    }
   //    $scope.allPosts[findPostById(content.Id, $scope.allPosts)].Flagged = true;
   //    queue('drive', GoogleDriveService.updateFlagged(content.Id, true), null, function (err) {
   //       $timeout(function () { //makes angular update values
   //          content.Flagged = false;
   //          $scope.visiblePosts.splice(arrayIndex, 0, content);
   //       });
   //       $mdToast.showSimple('Error flagging post, try again.');
   //       console.warn(err)
   //    }, 150);
   //    //set the poster's has flagged date back
   //    for (var item = 0; item < $scope.userList.length; item++) {
   //       if ($scope.userList[item][0] && $scope.userList[item][0] == content.Creator.Email) {
   //          var range = 'Sheet1!H' + (item + 2);
   //          var today = $filter('date')(new Date(), 'M/d/yy');
   //          queue('sheets', GoogleDriveService.updateSpreadsheetRange(range, [today]), null, function (err) {
   //             $timeout(function () { //makes angular update values
   //                content.Flagged = false;
   //                $scope.visiblePosts.splice(arrayIndex, 0, content);
   //             });
   //             console.warn(err)
   //             $mdToast.showSimple('Error flagging post, try again.');
   //          }, 2);
   //       }
   //    }
   // };
   // $scope.unFlagPost = function (content, arrayIndex) {
   //    var timeoutDate = new Date($scope.myInfo.LastBeenFlaggedDate.getTime() + 7 * 86400000);
   //    if (timeoutDate < new Date()) {
   //       content.Flagged = false;
   //       if ($scope.queryParams.classPath == 'flagged') {
   //          $timeout(function () { //makes angular update values
   //             $scope.visiblePosts.splice(arrayIndex, 1);
   //          });
   //       }
   //       $scope.allPosts[findPostById(content.Id, $scope.allPosts)].Flagged = false;
   //       $scope.updateVisiblePosts($scope.filterPosts($scope.allPosts));
   //       queue('drive', GoogleDriveService.updateFlagged(content.Id, false), null, function (err) {
   //          $mdToast.showSimple('Error unflagging post, try again.');
   //          console.warn(err)
   //       }, 150);
   //    } else {
   //       $mdDialog.show($mdDialog.alert({
   //          title: 'Uh Oh.',
   //          htmlContent: '<p style="margin: 0 0 2px 0">One of your posts has been flagged within the past week.<br>To unlock the ability to unflag posts, don\'t let your posts get flagged this week.</p>',
   //          ok: 'Ok'
   //       }));
   //    }
   // };
   $scope.likePost = function (content) {
      content.userLiked = !content.userLiked || false;
      if (typeof (likeClickTimer[content.Id]) == 'number') clearTimeout(likeClickTimer[content.Id]);
      likeClickTimer[content.Id] = setTimeout(function () {
         var arrayIndecies = getIdIndexInPostArrays(content.Id)
         promiseQueue().addPromise('drive', APIService.runGAScript('likePost', {
            operation: 'likePost',
            postId: content.id,
            content: content.userLiked,
         }, true), function (data) {
            console.log(data)
            var res = data.result.response.result.split(" ");
            console.log(res[1])
            $timeout(function () {
               ($scope.allPosts[arrayIndecies.allPosts] || {}).userLiked = res[0];
               ($scope.sortedPosts[arrayIndecies.sortedPosts] || {}).userLiked = res[0];
            })
         }, function (err) {
            console.warn(err)
            $mdToast.showSimple('Error liking post, try again.');
         }, 150);
      }, 3000);
   };

   //----------------------------------------------------
   //---------------- Event Watchers --------------------
   window.addEventListener("resize", function () {
      if ($mdMedia('gt-sm')) $mdSidenav('sidenav_overlay').close()
   });
   content_container.onscroll = function (event) {
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
   document.onkeydown = function (e) {
      if (e.altKey && e.ctrlKey) {
         if (e.keyCode == 68) {
            devMode = !devMode
            $timeout(function () {
               $scope.devMode = devMode;
            })
         }
         if (e.keyCode == 75) {
            alert('handeling signin click')
            authorizationService.handleSigninClick(function () {
               alert('done')
            });
         }
         if (e.keyCode == 76) {
            alert('running siginin initialization')
            authorizationService.initilize(function () {
               alert('done')
            })
         }
         if (e.keyCode == 77) {
            alert('signing out')
            gapi.auth2.getAuthInstance().signOut();
         }
      }
   }

   //----------------------------------------------------
   //----------------- Error Handling -------------------
   window.DriveErrorHandeler = function (error, item) {
      console.warn(error);
      console.log(item);
      if (error.hasOwnProperty('expectedDomain')) {
         gapi.auth2.getAuthInstance().signOut();
         $mdDialog.show($mdDialog.alert({
            title: 'Sorry.',
            htmlContent: "<p>York Study Resources only works with York Google accounts right now.</p><p>If you have an email account ending with @york.org, please login with it, or ask Mr.Brookhouser if you don't have one.<p>",
            ok: 'Ok'
         })).then(function () {
            angular.element(document.querySelector('#login_spinner')).addClass('fadeOut');
            setTimeout(function () {
               angular.element(document.querySelector('#auth_button')).addClass('fadeIn');
            }, 500);
         });
      }
      if (error.result) {
         // var newItem = JSON.parse(JSON.stringify(item).replace(/(?:"Authorization":"Bearer )[^"]+/,'"Authorization":"Bearer woop woop ' + authorizationService.getAuthToken() + '"'));
         // 		console.log(newItem)
         if (error.result.error.errors[0].message == 'Invalid Credentials') {
            console.warn("invalid credentials")
            $mdToast.show($mdToast.simple().textContent('Please signin again.')).hideDelay(8000);
            authorizationService.showSigninButton();
            authorizationService.showSigninDialog();
         } else if (error.result.error.errors[0].reason == 'dailyLimitExceededUnreg') {
            console.warn('daily limit reached')
            $mdToast.show($mdToast.simple().textContent('Please signin again.')).hideDelay(8000);
         }
      }
      if (item.Err) {
         item.Err(error)
      }
   }
   window.clearUserInfo = function () {
      $timeout(function () {
         $scope.myInfo = {};
         $scope.sortedPosts = [];
      })
   }

   //----------------------------------------------------
   //---------------- Utility Functions --------------------
   var theQueue = {};
   var timer = {};
   var delay = 0;

   // Take a promise.  Queue 'action'.  On 'action' faulure, run 'error' and continue.
   window.promiseQueue = function () {
      var queueSelf = this;
      this.addPromise = function (typeName, promiseFunc, action, error, interval) {
         typeName = typeName || 'general';
         if (!theQueue[typeName]) theQueue[typeName] = []
         theQueue[typeName].push({
            promiseFunc: promiseFunc,
            action: action,
            err: error,
         });
         if (!timer[typeName]) {
            processTheQueue(typeName); // start immediately on the first invocation
            timer[typeName] = setInterval(function () {
               processTheQueue(typeName)
            }, interval || 150);
         }
      };

      function processTheQueue(typeName) {
         var item = theQueue[typeName].shift();
         if (item) {
            var delay = 0;
            if (new Date(authorizationService.GUser.getAuthResponse(true).expires_at) > new Date()) {
               queueSelf.runPromise(item);
            } else {
               authorizationService.GUser.reloadAuthResponse().then(function (res) {
                  console.log('reloaded token')
               }, function (err) {
                  console.warn(err)
                  gapi.auth2.getAuthInstance().signOut().then(function () {
                     authorizationService.showSigninButton();
                  })
               })

            }
         }
         if (theQueue[typeName].length === 0) {
            clearInterval(timer[typeName]), timer[typeName] = null;
         }
      }

      this.runPromise = function (item) {
         var promise = item.promiseFunc();
         promise.then(item.action, function (error) {
            APIErrorHandeler(error, item);
            if (item.Err) {
               item.Err(error);
            } else if (delay < 4) {
               setTimeout(function () {
                  runPromise(item);
               }, (delay = Math.max(delay *= 2, 1)) * 1000);
            }
         });
      }
      return this
   }

   function updateSortedPosts(array, callback) {
      console.log(array)
      $timeout(function () {
         if (array) {
            $scope.sortedPosts = array;
         }
         if (callback) {
            callback();
         }
      })
   }

   function getIdIndexInPostArrays(id) {
      function findPostIndexById(id, array) {
         var index = 0;
         for (index in array) {
            if (array[index].id == id) return (index)
         }
      }
      return {
         allPosts: findPostIndexById(id, $scope.allPosts),
         sortedPosts: findPostIndexById(id, $scope.sortedPosts),
      }
   }

   $scope.openLink = function (link, dontOpen) {
      console.log(link)
      if (link != "" && link != undefined && dontOpen != true) window.open(link)
   };

   $scope.removeHttp = function (input) {
      if (input) {
         return (input.replace(/(?:http|https):\/\//, '').replace('www.', ''))
      } else {
         return input
      }
   }

   function mergeFirebasePost(fullPost, slimedPost) {
      fullPost.class = slimedPost.class
      fullPost.likeCount = slimedPost.likeCount
      fullPost.updateDate = slimedPost.updateDate
      fullPost.creationDate = slimedPost.creationDate
      fullPost.creator.classOf = slimedPost.creator.classOf
   }

   //----------------------------------------------------
   //---------------------- dev -------------------------
   $scope.consoleLogInput = function (input, asAlert) {
      console.log(input)
      if (asAlert) window.alert(JSON.stringify(input, null, 4))
   }

   $scope.consoleLogVariable = function (input, asAlert) {
      console.log(self[input])
      if (asAlert) window.alert(JSON.stringify(self[input], null, 4))
   }

   $scope.logPostToConsole = function (content, arrayIndex) {
      console.log({
         'loggedPostContent': content,
         'arrayIndex': arrayIndex,
         'converted': 'not used'
      });
   }

   $scope.refreshLayout = function () {
      angularGridInstance.postsGrid.refresh();
   }
}
