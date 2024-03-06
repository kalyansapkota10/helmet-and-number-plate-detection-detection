from flask import Flask, render_template, Response, jsonify, send_from_directory, request, redirect, url_for
from flask_mail import Mail, Message
import cv2
import numpy as np
import os
import sqlite3
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables from the .env file
load_dotenv('info.env')

app = Flask(__name__)

#Flask-Mail configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER']= os.getenv('MAIL_DEFAULT_SENDER')
mail = Mail(app)

# Load YOLO for motorbike and number plate detection
net_motorbike = cv2.dnn.readNet("yolov3-custom_7000.weights", "yolov3-custom1.cfg")

# Load YOLO for helmet detection
net_helmet = cv2.dnn.readNet("yolov3_custom_4000.weights", "yolov3_custom.cfg")

# Load classes for both models
with open("motorbike_number_plate.names", "r") as f:
    motorbike_classes = f.read().strip().split('\n')
layer_names = net_motorbike.getLayerNames()
output_layers = [layer_names[i - 1] for i in net_motorbike.getUnconnectedOutLayers()]

with open("helmet.names", "r") as f:
    helmet_classes = f.read().strip().split('\n')
layer_names_helmet = net_helmet.getLayerNames()
output_layers_helmet = [layer_names_helmet[i - 1] for i in net_helmet.getUnconnectedOutLayers()]

# Create a directory to save license plate images
if not os.path.exists('number_plate_images'):
    os.mkdir('number_plate_images')


global motorbike_id
def generate_frames():
    save_number_plate = False  # Flag to control license plate saving
    number_plate_counter = 1
    # Create a dictionary to store information about each tracked motorbike
    tracked_motorbikes = {}
    cap = cv2.VideoCapture('ipvideo.mp4')
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # motorbike and number plate detection
        height, width, channels = frame.shape
        blob_motorbike = cv2.dnn.blobFromImage(frame, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
        net_motorbike.setInput(blob_motorbike)
        outs_motorbike = net_motorbike.forward(output_layers)

        # Helmet detection
        height_helmet, width_helmet, channels = frame.shape
        blob_helmet = cv2.dnn.blobFromImage(frame, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
        net_helmet.setInput(blob_helmet)
        outs_helmet = net_helmet.forward(output_layers_helmet)

        # Information to display on the frame
        motorbike_boxes = []
        motorbike_class_ids = []
        helmet_class_ids = []
        motorbike_confidences = []
        helmet_boxes = []
        helmet_confidences = []

        for out in outs_motorbike:
            for detection in out:
                scores = detection[5:]
                motorbike_class_id = np.argmax(scores)
                confidence = scores[motorbike_class_id]

                if confidence > 0.5:
                    center_x = int(detection[0] * width)
                    center_y = int(detection[1] * height)
                    w = int(detection[2] * width)
                    h = int(detection[3] * height)
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    motorbike_boxes.append([x, y, w, h])
                    motorbike_confidences.append(float(confidence))
                    motorbike_class_ids.append(motorbike_class_id)

        indexes = cv2.dnn.NMSBoxes(motorbike_boxes, motorbike_confidences, 0.5, 0.4)

        # Reset the flag to False at the beginning of each frame
        save_number_plate = False

        for out in outs_helmet:
            for detection in out:
                scores = detection[5:]
                helmet_class_id = np.argmax(scores)
                confidence = scores[helmet_class_id]

                if confidence > 0.5:
                    center_x = int(detection[0] * width_helmet)
                    center_y = int(detection[1] * height_helmet)
                    w = int(detection[2] * width_helmet)
                    h = int(detection[3] * height_helmet)
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    helmet_boxes.append([x, y, w, h])
                    helmet_confidences.append(float(confidence))
                    helmet_class_ids.append(helmet_class_id)

                    if helmet_classes[helmet_class_id] != "Helmet":
                        save_number_plate = True  # Set the flag to True when helmet is absent

        indexes_helmet = cv2.dnn.NMSBoxes(helmet_boxes, helmet_confidences, 0.5, 0.4)

        # Draw bounding boxes for motorbikes, number plates, and helmets
        for i in range(len(motorbike_boxes)):
            if i in indexes:
                x, y, w, h = motorbike_boxes[i]
                label = str(motorbike_classes[motorbike_class_ids[i]])
                confidence = motorbike_confidences[i] 

                # Customize this section to identify "motorbike" and "number plate" classes
                if label == "Motorbike":
                    color = (0, 255, 0)  # Green for motorbike
                    # Check if this motorbike was already tracked
                    motorbike_id = -1
                    for tracked_id, tracked_info in tracked_motorbikes.items():
                        last_x, last_y,last_w,last_h = tracked_info['last_position']
                        # You may need to adjust this condition based on your specific case
                        if abs(x - last_x) < 80 and abs(y - last_y) < 80:
                            motorbike_id = tracked_id
                            break

                    if motorbike_id == -1:
                        # This is a new motorbike, assign a new ID
                        motorbike_id = len(tracked_motorbikes) + 1
                        tracked_motorbikes[motorbike_id] = {'last_position': (x, y, w, h),
                                                            'number_plate_saved': False}

                    else:
                        # This motorbike was already tracked, update its position
                        tracked_motorbikes[motorbike_id]['last_position'] = (x, y, w, h)

                else:
                    color = (0, 0, 255)  # Red for license plate

                    # Check if the license plate needs to be saved for this motorbike
                    if label == "NumberPlate" and save_number_plate and not tracked_motorbikes[
                        motorbike_id]['number_plate_saved']:
                        # Crop the region of the number plate
                        number_plate_region = frame[y:y + h, x:x + w]
                        filename = f'number_plate_images/number_plate_{number_plate_counter}.jpg'
                        cv2.imwrite(filename, number_plate_region)
                        number_plate_counter += 1
                        tracked_motorbikes[motorbike_id]['number_plate_saved'] = True

                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                cv2.putText(frame,f"{label} {confidence:.2f}", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        for k in range(len(helmet_boxes)):
            if k in indexes_helmet:
                x, y, w, h = helmet_boxes[k]
                label = str(helmet_classes[helmet_class_ids[k]])
                confidence = helmet_confidences[k]

                # Customize this section to identify "helmet" and "no_helmet" classes
                if label == "Helmet":
                    color = (0, 255, 0)  # Green for helmet
                else:
                    color = (0, 0, 255)  # Red for no helmet

                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                cv2.putText(frame, f"{label} {confidence:.2f}", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def adminlogin():
    return render_template('login.html')


@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/api/number_plate_images')
def get_number_plate_images():
    images = []
    for filename in os.listdir('number_plate_images'):
        if filename.endswith('.jpg'):
            images.append(filename)  # Store only the filename, not the full path

    return jsonify({'NumberPlateImages': images})


@app.route('/number_plate_images/<path:filename>')
def serve_number_plate_image(filename):
    return send_from_directory('number_plate_images', filename)


@app.route('/api/formData',methods=['POST'])
def index():
    try:
        data = request.json
        zonalCode = data.get('zonalCode')
        lotNo = data.get('lotNo')
        vehicleType = data.get('vehicleType')
        vehicleId= data.get('vehicleId')
        current_date = datetime.now().date().strftime("%Y-%m-%d")
        text = f"{zonalCode}-{lotNo}-{vehicleType}-{vehicleId}"
        conn = sqlite3.connect('added_texts.db')
        cursor = conn.cursor()
        cursor.execute('INSERT INTO vehicle_log (date,vehicle_Id) VALUES (?, ?)', (current_date,text))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Form submitted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})


@app.route('/api/send_details', methods=['POST'])
def send_details():
     data = request.json
     name= data.get('name')
     email = data.get('email')
     vehicle_no = data.get('vehicleNo')
     rule_violated = data.get('ruleViolated')
     amount = data.get('amount')
     date_fined = data.get('dateFined')
     # Prepare and send the email
     subject = f"Traffic Rule Voilation"
     body = f"Dear Sir/Madam, We have found you riding motorbike without helmet and charged you for that violation.\n\nKindly pay the bill within a week otherwise the amount will increase by Rs.100 for a day.\n\nYou can see the details below:\n\nName: {name}\nVehicle no: {vehicle_no}\nRule violated: {rule_violated}\nAmount: {amount}\nDate Fined: {date_fined}"
     try:
         msg = Message(subject, recipients=[email], body=body)
         mail.send(msg)
         return jsonify({'success': True, 'message': 'Email sent successfully'})
     except Exception as e:
         return jsonify({'success': False, 'message': str(e)})


@app.route('/api/get_added_texts', methods=['GET'])
def get_added_texts():
    conn = sqlite3.connect('added_texts.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM vehicle_log')
    rows = cursor.fetchall()
    added_vehicle = [{'id':row[0],'date': row[1], 'paid': row[2], 'vehicle_id': row[3]} for row in rows]
    conn.close()
    return jsonify({'addedVehicle': added_vehicle})


@app.route('/api/send_id', methods=['GET','POST'])
def get_id():
    data_received = request.json
    id_value = data_received.get('id')
    print(id_value)
    conn = sqlite3.connect('added_texts.db')
    cursor = conn.cursor()
    cursor.execute('''
    SELECT
    vehicle_owner.Vehicle_ID,
    vehicle_owner.Name AS Owner_Name,
    vehicle_owner.email AS Owner_Email,
    vehicle_log.id AS Log_ID,
    vehicle_log.date AS Log_Date,
    vehicle_log.paid AS Log_Paid_Status
    FROM
        vehicle_owner
    INNER JOIN
        vehicle_log ON vehicle_owner.Vehicle_ID = vehicle_log.vehicle_Id
    WHERE
        vehicle_log.id =?;
    ''', (id_value,))
    rows = cursor.fetchall()
    owner_texts = [{'vehicle_id':row[0],'owner_name': row[1], 'owner_email': row[2],'date':row[4]} for row in rows]
    conn.close()
    return jsonify({'ownerTexts': owner_texts})


@app.route('/api/validation', methods=['GET'])
def loginValidation():
    conn = sqlite3.connect('login_validation.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM User_details')
    rows = cursor.fetchall()
    user_details = [{'Email':row[0],'Password': row[1]} for row in rows]
    print(user_details)
    conn.close()
    return jsonify({'userDetails': user_details})


@app.route('/api/validation', methods=['POST'])
def newPassword():
    data = request.json
    newPwd = data.get('updatedPwd')
    conn = sqlite3.connect('login_validation.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE User_details SET Password=? WHERE Email=?',(newPwd,"kalyansapkota51@gmail.com"))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'new password created successfully '})

@app.route('/validated')
def validated():
    return render_template('index.html')


@app.route('/forgetPassword')
def forgetPassword():
    return render_template('forget.html')


@app.route('/api/sendMailForOtp',methods=['POST'])
def MailForOtp():
    data = request.json
    emailOtp = data.get('emailForOtp')
    otpGeneration = data.get('otpGenerated')
    subject = f"OTP Generated For You"
    body = f"The following OTP is generated for you. Use this OTP to create new password\n\nOTP: {otpGeneration}"
    try:
        msg = Message(subject, recipients=[emailOtp], body=body)
        mail.send(msg)
        return jsonify({'success': True, 'message': 'OTP sent successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})


@app.route('/newPassword')
def newPasswordIndex():
    return render_template('newPassword.html')


if __name__ == '__main__':
    app.run(debug=True)
