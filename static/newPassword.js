const submitButton = document.getElementById('submitBtn');
let updated_password = newPasswordGeneration();

//function to get the data from the database
function newPasswordGeneration(){
    let password= "";
    fetch('/api/validation', {method: 'GET'})
    .then(response =>response.json())
    .then(data => {
        data.userDetails.forEach(function(entry){
            password = entry.Password;
            console.log(password);
        });
        return password;
    })
}

submitButton.addEventListener('click', function(e){
    e.preventDefault();
    passwordMatching();
    insertNewPassword(updated_password);
});

function passwordMatching(){
    const newPassword = document.getElementById('newPwd').value;
    const confirmPassword = document.getElementById('confirmPwd').value;
    if(newPassword == confirmPassword){
        updated_password = newPassword;
        return updated_password;
    }
    else{
        alert("Password didnot match");
        
    }
}

function insertNewPassword(updated_password){
     const updatedPwd = updated_password;
     console.log(updatedPwd);
     data = {updatedPwd};
    fetch('/api/validation',{
        method: 'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result =>{
        if(result.success){
            alert('New passsword created!')
            window.location.href='/';
        }
    })
    .catch(error =>{
        console.log('Error: ',error);
    })
}