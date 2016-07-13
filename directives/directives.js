// Put any directives you make here and the html template in a file in the directives/html/ folder

// ----Outer UI----
app.directive('toolbarTop', function() {
    return {
        restrict: 'E',
        templateUrl: 'directives/html/toolbarTop.html'
    };
});
app.directive('toolbarTopMobile', function() {
    return {
        restrict: 'E',
        templateUrl: 'directives/html/toolbarTopMobile.html'
    };
});
app.directive('searchBar', function() {
    return {
        restrict: 'E',
        templateUrl: 'directives/html/searchBar.html'
    };
});
app.directive('sideNavInsides', function() {
    return {
        restrict: 'A',
        templateUrl: 'directives/html/sideNavInsides.html'
    };
});
app.directive('addLowerButton', function() {
    return {
        restrict: 'E',
        templateUrl: 'directives/html/addLowerButton.html'
    };
});

// ----Posts layout pieces----
app.directive('postCard', function() {
    return {
        restrict: 'EA',
        templateUrl: 'directives/html/postCard.html'
    };
});

app.directive('addBarTop', function() {
    return {
        restrict: 'E',
        templateUrl: 'directives/html/addBarTop.html'
    };
});

app.directive('newPostContent', function() {
    return {
        restrict: 'E',
        templateUrl: 'directives/html/newPostContent.html'
    };
});


app.directive('getPosts', function() {
    return {
        restrict: 'AE',
        link: function(scope, elem, attrs) {
            scope.$parent.getQueryProperties = function() {
                console.log("getting query props")
                scope.$parent.queryProperties.Flagged = attrs.flagged;
                scope.$parent.queryProperties.Class = attrs.class;
                scope.$parent.queryProperties.CreatorEmail = attrs.creatorEmail;
                scope.$parent.queryProperties.Type = attrs.type;
            }
        }
    };
});

// ----New post pieces----
app.directive('classSelectMenu', function() {
    return {
        restrict: 'E',
        templateUrl: 'directives/html/classSelectMenu.html'
    };
});