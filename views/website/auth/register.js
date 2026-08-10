$(function () {

    $("#registerForm").submit(function (e) {

        e.preventDefault();

        $.ajax({

            url: "/website/register",

            type: "POST",

            data: $(this).serialize(),

            success: function (response) {

                if (response.status) {

                    alert(response.message);

                    window.location.href = "/website/login";

                } else {

                    alert(response.message);

                }

            },

            error: function () {

                alert("Registration failed.");

            }

        });

    });

});