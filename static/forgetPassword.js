const sendOtpBtn = document.getElementById('sendBtn'); 
const verifyBtn = document.getElementById('verifyBtn');
let otpNumber = otpGeneration();//initially assigns an otp number 

//function that generate random 4 digit otp
function otpGeneration(){
    let otp = "";
    for(var i=0;i<4;i++)
    {
        otp+= Math.floor(Math.random()*10);
    }
    return Number(otp);
}

sendOtpBtn.addEventListener('click',function(event){
    event.preventDefault();
    sendOtp();
});


//function that sends email and otp to the server
function sendOtp(){
    
    const emailForOtp = document.getElementById('emailForOtp').value;
    const otpVerify = document.querySelector('.otpverify');
    const otpGenerated = otpNumber;
    console.log(otpGenerated);
    const sendData= {
        emailForOtp,
        otpGenerated
    };
    fetch('/api/sendMailForOtp',{
        method:'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success){
            //alert('An OTP has been sent to your email');
            otpVerify.style.display = "block";
            sendOtpBtn.disabled = true;
            sendOtpBtn.style.backgroundColor = "#dbe3db";
            sendOtpBtn.style.cursor = "auto";
            document.getElementById('text').innerHTML="Enter the OTP that has been sent to your email."
            //emailForOtp.value="";
        } 
        else {
            alert('Failed to send OTP. ' + result.message);
        }
    })
    .catch(error => {
        console.error('Error sending OTP:', error);
    });  
}

verifyBtn.addEventListener('click',function(event){
    event.preventDefault();
    otpVerification();
})


//function to verify the otp
function otpVerification(){
 const otpInput = document.getElementById('otp_inp').value;
 const otpInputNumber = parseInt(otpInput);
 const otpsent = otpNumber;
 console.log(otpsent);
 if(otpInputNumber==otpsent){
    window.location.href='/newPassword';
 }
 else{
    alert("OTP didnot match");
 }

}