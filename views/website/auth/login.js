$(document).ready(function () {

    $("#loginForm").submit(function (e) {

        e.preventDefault();

        $.ajax({

            url: "/website/login",

            type: "POST",

            data: $(this).serialize(),

            success: function (response) {

                if (response.status) {

                    alert(response.message);

                    window.location.href = "/";

                } else {

                    alert(response.message);

                }

            },

            error: function () {

                alert("Login failed.");

            }

        });

    });

});