/* we don't define the "new post controller" here because it was alredy
   defined by the $md-dialog in the newPost function on mainController.   */
function newPostController($scope, $mdDialog, GoogleDriveService) {
    $scope.close = function () {
        $mdDialog.hide();
    };
    $scope.Tags = [];
    $scope.Title = '';
    $scope.Description = '';
    $scope.Link = '';
    $scope.readOnly = false;
    $scope.classSearch = "";
    $scope.courses = ["English III", "Spanish I", "Chemistry", "AP Biology", "Geometry", "Algebra II", "Physics", "calc AB", "Chinese I"];
    $scope.submit = function () {
        GoogleDriveService.getUserInfo().then(function (userInfo) {
            console.log(userInfo.result);
            var description = document.querySelector('#DescriptionTxt').textContent;
            var type = function () {
                if ($scope.Link === '') {
                    return ('NoLink');
                } else {
                    return ('Link');
                }
            };
            var response = ({
                "Type": type,
                "Title": $scope.Title,
                "Creator": {
                    "Name": userInfo.result.user.displayName,
                    "Email": userInfo.result.user.emailAddress,
                    "ClassOf": '2018',
                },
                "CreationDate": new Date(),
                "UpdateDate": new Date(),
                "Tags": $scope.Tags,
                "Description": description,
                "Class": {
                    "Name": "Name Of Class",
                    "Teacher": "name of teacher"
                },
                "Link": $scope.Link,
                "FileId": "If present, the link to the resource of the post (haven't setup ui drive integration yet)",
                "ImageURL": "",
                "LikeUsers": [],
            });
            console.log(response);
            console.log('sending...');
            GoogleDriveService.sendDriveFile(response, $scope.Title).then(function (reply) {
                console.log(reply.result);
                $scope.close();
            });
        });
    };
}