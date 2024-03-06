const voilationBtn = document.querySelector(".voilation-link");
const sendMail = document.querySelector(".send-mail-container");
const viewBtn = document.getElementsByClassName("view-btn");
const image = document.getElementsByClassName("images");
const overlay = document.querySelector(".onclick-overlay");
const closeBtn = document.getElementsByClassName("close-btn");
const doneBtn = document.getElementById("done-btn");
const successful = document.querySelector(".successful");
const numberForm = document.querySelector(".number-fill");
const datePicker = document.getElementById("date-picker").value=getCurrentDate();
const homeBtn = document.querySelector(".home");
const main = document.querySelector(".main-container");
const voilationLog = document.querySelector(".voilation-container");
const sendMailBtn = document.querySelector(".btn");
let id ;
let selectedDate= getCurrentDate();
let entriesByDate = {};//Object to store entries grouped by date


function leftArrowClick(){
    voilationLog.style.display = "flex";
    sendMail.style.display="none";  
}

// Function to update the images container
function updateImages(images) {
    const imagesContainer = document.querySelector('.number-img');
    imagesContainer.innerHTML='';
    images.forEach(image => {
        const imgElement = document.createElement('img');
        imgElement.classList.add("images")
       
        imgElement.src = `/number_plate_images/${image}`;
        imgElement.alt = 'Number Plate Image';
        imgElement.addEventListener("click", function() {
            const overlay = document.querySelector(".onclick-overlay");
            const successful = document.querySelector(".successful");
            const numberForm = document.querySelector(".number-fill");

            overlay.style.display = "block";
            successful.style.display = "none";
            numberForm.style.display = "flex";
        });

        imagesContainer.appendChild(imgElement);

    });
} 

  // Fetch number plate images from the backend
function fetchNumberPlateImages() {
    
    fetch('/api/number_plate_images', { method: 'GET' })
        .then(response => response.json())
        .then(data => {
            // Update images container
            updateImages(data.NumberPlateImages);
        })
        .catch(error => console.error('Error fetching number plate images:', error));
}
// Call fetchNumberPlateImages function to initiate fetching and updating
setInterval(fetchNumberPlateImages,15000);


function fetchEntries() {
    fetch('/api/get_added_texts', {method: 'GET'})
    .then(response => response.json())
    .then(data => {   
        groupEntriesByDate(data);// Group entries by date  
        renderEntriesForDate(selectedDate);// Render entries for the current date
        }).catch(error => console.error('Error fetching entries:', error));         
}
fetchEntries();

document.addEventListener("DOMContentLoaded", function() {
    
    for (var i = 0; i < image.length; i++) {
        image[i].addEventListener("click", function() {
            overlay.style.display = "block";
            successful.style.display = "none";
            numberForm.style.display = "flex";
        });
    }

    for (var i = 0; i < closeBtn.length; i++) {
        closeBtn[i].addEventListener("click", function() {
            overlay.style.display = "none";
        });
    }

    doneBtn.addEventListener("click", function(e) {
        e.preventDefault();
        successful.style.display = "flex";
        numberForm.style.display = "none";
        formdata();
    });

            
    function formdata(){

        // Get form data
        const zonalCode = document.getElementById('zonalCode').value;
        const lotNo = document.getElementById('lotNo').value;
        const vehicleType = document.getElementById('vehicleType').value;
        const vehicleId = document.getElementById('vehicleId').value;
        
        //these data are prepared to be sent to server
        const formData = {
            zonalCode,
            lotNo,
            vehicleType,
            vehicleId
        }
        // Send fetch request
        fetch('/api/formData', {
            method: 'POST',
            headers:{
                'Content-Type':'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(result =>{
            if(result.success){
                //first clear the existing entries to prevent data repetition
                entriesByDate = {};
                fetchEntries();
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }   

    homeBtn.addEventListener("click",function(){
        main.style.display="flex";
        voilationLog.style.display="none";
        voilationBtn.classList.remove("active")
        homeBtn.classList.add("active")
        sendMail.style.display="none";
    });
    
    voilationBtn.addEventListener("click", function() {
        main.style.display = "none";
        sendMail.style.display="none";
        voilationLog.style.display = "flex";
        voilationBtn.classList.add("active");
        homeBtn.classList.remove("active");
    });
     
});
        

// Function to get the current date in the format MM/DD/YYYY
function getCurrentDate() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    let month = currentDate.getMonth() + 1;
    month = month < 10 ? '0' + month : month;
    let day = currentDate.getDate();
    day = day < 10 ? '0' + day : day;
    return `${year}-${month}-${day}`;
}


// Function to group entries by date
function groupEntriesByDate(data) {
    data.addedVehicle.forEach(function(entry) {
        if (!entriesByDate[entry.date]) {
            entriesByDate[entry.date] = [];
        }
        entriesByDate[entry.date].push(entry);
    });
}


// Function to render entries for a specific date
function renderEntriesForDate(date) {
    let tableBody = document.querySelector('#tbody');
    tableBody.innerHTML = ''; // Clear existing entries

    if (entriesByDate[date]) {
        entriesByDate[date].forEach(function(entry) {

            let tr = document.createElement('tr');
            tr.classList.add('list-row');
            tr.innerHTML = `
                <td> ${entry.vehicle_id} </td>
                <td class="date-data" id="date-recorded">${entry.date}</td>
                <td class="status-data"><button class="status-btn ${entry.paid}">${entry.paid}</button></td>
                <td><button class="view-btn">View</button></td>`;
            tableBody.appendChild(tr);
            
            let viewButton = tr.querySelector('.view-btn');
            viewButton.addEventListener('click',function(){
                voilationLog.style.display="none";
                sendMail.style.display="flex";  
                handleViewButton(entry);
            });
            
        });
    }else {
        console.log(`No entries found for date: ${date}`);
    }
}

//Function that shows the details after clicking on view button
function handleViewButton(entry){
    console.log('button clicked for entry',entry);
    id= entry;
    console.log(id);
    fetch('/api/send_id',{
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:JSON.stringify(id)
    })
    .then(response=>{
        if(response.ok){
            return response.json();
        }
        throw new Error('Network response was not ok.');
    })
    .then(data => {
        const detailContent = document.querySelector('.detail-container')
        detailContent.innerHTML = '';
        let div = document.createElement('div');
        div.classList.add('subtext');
        div.innerHTML ="";
        div.innerHTML=` 
        <div class="r12">
            <Span class="row1">Name</Span>
            <span class ="row2" id="name" style="padding-left: 90px;">${data.ownerTexts[0]['owner_name']}</span>
            <br>
        </div>

        <div class="r12">
            <Span class="row1">Vehicle number</Span>
            <span class ="row2" id="vehicleNo" style="padding-left: 5px;">${data.ownerTexts[0]['vehicle_id']}</span>
            <br>
        </div>

        <div class="r12">
            <Span class="row1">Email address</Span>
            <span class ="row2" id="email-address" style="padding-left: 22px;">${data.ownerTexts[0]['owner_email']}</span>
            <br>
        </div>

        <div class="r12">
            <Span class="row1">Rule violated</Span>
            <span class ="row2" id="rule-violated" style="padding-left: 29px;">Not wearing helmet while riding</span>
            <br>
        </div>

        <div class="r12">
            <Span class="row1">Fine amount</Span>
            <span class ="row2" id="fine-amount" style="padding-left: 32px;">Rs. 1500</span>
            <br>
        </div>

        <div class="r12">
            <Span class="row1">Date fined</Span>
            <span class ="row2" id="date-fined" style="padding-left: 50px;">${data.ownerTexts[0]['date']}</span>
            <br>
        </div>
            
    </div>

        <div class="buttons">
            <button type="submit" class="submit-btn1" onclick="handleSendButtonClick()">SEND EMAIL</button>
        </div>
    </div>`
    detailContent.appendChild(div);
    
    }).catch(error => {
        console.error('Error fetching entries:', error);
    });

    sendMailBtn.addEventListener('click',function(e){
        e.preventDefault();
        
    });

    voilationLog.style.display="none";
    sendMail.style.display="flex";  
}


const datePick = document.getElementById("date-picker");
datePick.addEventListener('change', function() {
    selectedDate = this.value;
    renderEntriesForDate(selectedDate);
});


// Function to handle "Send Email" button click
function handleSendButtonClick() {
   
    const email = document.getElementById('email-address').textContent;
    const name= document.getElementById('name').textContent;
    const vehicleNo = document.getElementById('vehicleNo').textContent;
    const ruleViolated = document.getElementById('rule-violated').textContent;
    const amount = document.getElementById('fine-amount').textContent;
    const dateFined = document.getElementById('date-fined').textContent;
    // Prepare data to be sent
    const data = {
        name,
        email,
        vehicleNo,
        ruleViolated,
        amount,
        dateFined
    };
  // Send the data to the backend
  fetch('/api/send_details', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
      if (result.success){
          alert('Details sent successfully!');
      } 
      else {
          alert('Failed to send details. ' + result.message);
      }
  })
  .catch(error => {
      console.error('Error sending details:', error);
  });   
}