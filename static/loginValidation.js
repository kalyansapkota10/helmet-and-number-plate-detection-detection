const loginButton = document.getElementById('loginForm');

loginButton.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission
    const uname = document.getElementById('text1').value;
    const pwd = document.getElementById('text2').value;
    validation(uname, pwd);
});


function validation(uname,pwd){
    fetch('/api/validation', {method: 'GET'})
    .then(response => response.json())
    .then(data =>{
        data.userDetails.forEach(function(entry){
            console.log(entry);
            if(entry.Email==uname && entry.Password==pwd){
                window.location.href= '/validated';
            }
            else{
                alert("invalid email or password");
                document.getElementById('text1').value='';
                document.getElementById('text2').value='';
            }
        });
    })
    .catch(error =>{
        console.error('error:',error);
    })
}

