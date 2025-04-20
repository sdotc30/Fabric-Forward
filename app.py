from flask import Flask, render_template, request, session, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin, login_user, logout_user, LoginManager, login_required
from flask_login import current_user
import os
from flask import jsonify
from flask_cors import CORS
from sqlalchemy import text  # Import the text function
import pymysql
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
import logging

# Load environment variables
load_dotenv()

# Environment variables for database connection
AIVEN_USER = os.getenv("AIVEN_USER")
AIVEN_PASSWORD = os.getenv("AIVEN_PASSWORD")
AIVEN_HOST = os.getenv("AIVEN_HOST")
AIVEN_PORT = os.getenv("AIVEN_PORT")
AIVEN_DB = os.getenv("AIVEN_DB")

# Validate environment variables
if not all([AIVEN_USER, AIVEN_PASSWORD, AIVEN_HOST, AIVEN_PORT, AIVEN_DB]):
    raise ValueError("Missing one or more database credentials in .env file.")


# After initializing Flask app
app = Flask(__name__)
CORS(app)  # This enables CORS for all routes


# Configure secret key
app.secret_key = os.getenv("SECRET_KEY")
if not app.secret_key:
    raise ValueError("SECRET_KEY is missing in the .env file.")

# Configure SQLAlchemy database URI
app.config[
    "SQLALCHEMY_DATABASE_URI"
] = f"mysql+pymysql://{AIVEN_USER}:{AIVEN_PASSWORD}@{AIVEN_HOST}:{AIVEN_PORT}/{AIVEN_DB}"

# SSL Configuration for Aiven Cloud MySQL
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "connect_args": {
        "ssl": {
            "ssl-mode": "REQUIRED",
        }
    }
}

# Initialize SQLAlchemy and LoginManager
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Logging configuration
logging.basicConfig(level=logging.DEBUG)

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return Users.query.get(int(user_id))

# Database Models
class Recipient(db.Model):
    rid = db.Column(db.Integer, primary_key=True)
    cloth_item = db.Column(db.String(100))
    quantity = db.Column(db.Integer)
    location = db.Column(db.String(300))
    gender = db.Column(db.String(50))
    age_group = db.Column(db.String(50))
    size = db.Column(db.String(50))
    description = db.Column(db.String(300))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))


class Users(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(1000), nullable=False)  # Hashed password
    role = db.Column(db.String(20), nullable=False)  # "donor" or "recipient"

class DonationStatus(db.Model):
    __tablename__ = 'donation_status'
    status_id = db.Column(db.Integer, primary_key=True)
    # Foreign key to the donation request (rid from Recipient table)
    rid = db.Column(db.Integer, db.ForeignKey('recipient.rid'), nullable=False)
    # Foreign key to the donor (user_id from Users table)
    donor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # Status values: "Acknowledgement Pending", "Donation Accepted", "Donation Ongoing"
    status = db.Column(db.String(50), nullable=False, default="Donation Request Listed") 


# Routes

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/donor_dashboard')
@login_required
def donor_dashboard():
    return render_template('donor_dashboard.html')


from datetime import datetime

@app.route('/recipient_dashboard', methods=["GET", "POST"])
@login_required
def recipient_dashboard():
    if request.method == "POST":
        cloth_item = request.form.get('cloth_item')
        quantity = request.form.get('quantity')
        location = request.form.get('location')
        gender = request.form.get('gender')
        age_group = request.form.get('age_group')
        size = request.form.get('size')
        description = request.form.get('description')

        new_request = Recipient(
            cloth_item=cloth_item,
            quantity=quantity,
            location=location,
            gender=gender,
            age_group=age_group,
            size=size,
            description=description,
            user_id=current_user.id
        )

        try:
            db.session.add(new_request)
            db.session.commit()
            flash("✅ Request posted successfully!", "success")
        except Exception as e:
            db.session.rollback()
            flash("Could not post request. Try again later.", "danger")
            logging.error(f"DB Error: {str(e)}")

        return redirect(url_for('recipient_dashboard'))

    return render_template('recipient_dashboard.html')

@app.route('/api/my_requests')
@login_required
def get_my_requests():
    if current_user.role != 'recipient':
        return jsonify({"error": "Unauthorized access"}), 403

    user_requests = Recipient.query.filter_by(user_id=current_user.id).all()
    
    data = []
    for req in user_requests:
        data.append({
            "id": req.rid,
            "cloth_item": req.cloth_item,
            "quantity": req.quantity,
            "location": req.location,
            "gender": req.gender,
            "age_group": req.age_group,
            "size": req.size,
            "desc": req.description
        })

    return jsonify(data)

@app.route("/api/delete_request/<int:request_id>", methods=["DELETE"])
@login_required
def delete_request(request_id):
    req = Recipient.query.get(request_id)
    if req and req.user_id == current_user.id:
        db.session.delete(req)
        db.session.commit()
        return jsonify({"message": "Deleted"}), 200
    return jsonify({"error": "Unauthorized"}), 403


@app.route("/api/edit_request/<int:request_id>", methods=["PUT"])
@login_required
def edit_request(request_id):
    req = Recipient.query.get(request_id)
    if req and req.user_id == current_user.id:
        data = request.get_json()
        req.cloth_item = data.get("cloth_item", req.cloth_item)
        req.quantity = data.get("quantity", req.quantity)
        req.location = data.get("location", req.location)
        req.gender = data.get("gender", req.gender)
        req.age_group = data.get("age_group", req.age_group)
        req.size = data.get("size", req.size)
        req.desc = data.get("desc", req.desc)
        db.session.commit()
        return jsonify({"message": "Updated"}), 200
    return jsonify({"error": "Unauthorized"}), 403

@app.route('/api/all_requests', methods=["GET"])
@login_required
def get_all_requests():
    if current_user.role != 'donor':
        return jsonify({"error": "Unauthorized access"}), 403
    

    location_query = request.args.get('location')
    gender_query = request.args.get('gender')
    age_group_query = request.args.get('age_group')
    size_query = request.args.get('size')

    query = Recipient.query

    if location_query:
        query = query.filter(Recipient.location.ilike(f"%{location_query}%"))
    if gender_query:
        query = query.filter(Recipient.gender.ilike(f"%{gender_query}%"))
    if age_group_query:
        query = query.filter(Recipient.age_group.ilike(f"%{age_group_query}%"))
    if size_query:
        query = query.filter(Recipient.size.ilike(f"%{size_query}%"))

    all_requests = query.all()
    data = []
    for req in all_requests:
        data.append({
            "id": req.rid,
            "cloth_item": req.cloth_item,
            "quantity": req.quantity,
            "location": req.location,
            "gender": req.gender,
            "age_group": req.age_group,
            "size": req.size,
            "desc": req.description
        })
    return jsonify(data)

@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html')

@app.route('/api/profile_data')
@login_required
def profile_data():
    if current_user.role != 'donor':
        return jsonify({"error": "Unauthorized access"}), 403
    
    # Fetching a single user
    user_data = Users.query.filter_by(id=current_user.id).first()

    if user_data is None:
        return jsonify({"error": "User not found"}), 404
    
    # Returning the data as a single object
    userd = {
        "Name": user_data.email.split('@')[0],
        "email": user_data.email,
        "role": user_data.role
    }

    return jsonify(userd)

@app.route('/api/status/create', methods=["POST"])
@login_required
def create_status():
    if current_user.role != "donor":
        return jsonify({"error": "Only donors can create status"}), 403

    data = request.get_json()
    rid = data.get("rid")

    if not rid:
        return jsonify({"error": "Recipient request ID is required"}), 400

    # Check if status already exists for this donor and request
    existing = DonationStatus.query.filter_by(rid=rid, donor_id=current_user.id).first()
    if existing:
        return jsonify({"error": "Status already exists"}), 400

    new_status = DonationStatus(
        rid=rid,
        donor_id=current_user.id,
        status="Acknowledgement Pending"
    )

    try:
        db.session.add(new_status)
        db.session.commit()
        return jsonify({"message": "Status created successfully"}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating status: {str(e)}")
        return jsonify({"error": "Database error"}), 500

@app.route('/api/status', methods=["GET"])
@login_required
def get_statuses():
    if current_user.role == "recipient":
        # Join with Recipient to filter by recipient's user_id
        statuses = db.session.query(DonationStatus, Recipient).join(Recipient).filter(
            Recipient.user_id == current_user.id
        ).all()

    elif current_user.role == "donor":
        statuses = db.session.query(DonationStatus, Recipient).join(Recipient).filter(
            DonationStatus.donor_id == current_user.id
        ).all()
    else:
        return jsonify({"error": "Unauthorized role"}), 403

    result = []
    for status, req in statuses:
        result.append({
            "status_id": status.status_id,
            "rid": status.rid,
            "donor_id": status.donor_id,
            "status": status.status,
            "cloth_item": req.cloth_item,
            "quantity": req.quantity,
            "location": req.location
        })
    return jsonify(result), 200

@app.route('/api/status/update/<int:status_id>', methods=["PUT"])
@login_required
def update_status(status_id):
    status_entry = db.session.get(DonationStatus, status_id)
    if not status_entry:
        return jsonify({"error": "Status not found"}), 404

    data = request.get_json()
    new_status = data.get("status")

    if not new_status:
        return jsonify({"error": "Status is required"}), 400

    recipient_req = Recipient.query.get(status_entry.rid)

    if current_user.role == "recipient":
        # Recipient can only update to "Donation Accepted"
        if recipient_req.user_id != current_user.id:
            return jsonify({"error": "Unauthorized recipient"}), 403
        if new_status != "Donation Accepted":
            return jsonify({"error": "Recipients can only acknowledge"}), 403

    elif current_user.role == "donor":
        # Donor can update to "Donation Ongoing" only *after* recipient has acknowledged
        if status_entry.donor_id != current_user.id:
            return jsonify({"error": "Unauthorized donor"}), 403

        if new_status == "Donation Ongoing" and status_entry.status != "Donation Accepted":
            return jsonify({"error": "Donation must be acknowledged first"}), 400

        # Donor can't set to "Donation Accepted"
        if new_status == "Donation Accepted":
            return jsonify({"error": "Donors cannot set this status"}), 403

    else:
        return jsonify({"error": "Unauthorized role"}), 403

    # Update and save
    status_entry.status = new_status
    try:
        db.session.commit()
        return jsonify({"message": f"Status updated to '{new_status}'"}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating status: {str(e)}")
        return jsonify({"error": "Database error"}), 500

@app.route('/api/status/delete/<int:rid>', methods=["DELETE"])
@login_required
def delete_status(rid):
    status_entry = DonationStatus.query.filter_by(rid=rid, donor_id=current_user.id).first()

    if not status_entry:
        return jsonify({"error": "Unauthorized or not found"}), 403

    try:
        db.session.delete(status_entry)
        db.session.commit()
        return jsonify({"message": "Donation status canceled"}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting status: {str(e)}")
        return jsonify({"error": "Database error"}), 500

@app.route('/api/acknowledge_donation/<int:rid>', methods=["PUT"])
@login_required
def acknowledge_donation(rid):
    if current_user.role != "recipient":
        return jsonify({"error": "Only recipients can acknowledge donations"}), 403

    # Check if the recipient actually made this request
    request_entry = Recipient.query.filter_by(rid=rid, user_id=current_user.id).first()
    if not request_entry:
        return jsonify({"error": "Request not found or unauthorized"}), 404

    # Find the corresponding DonationStatus
    status_entry = DonationStatus.query.filter_by(rid=rid).first()
    if not status_entry:
        return jsonify({"error": "Donation status not found"}), 404

    # Only allow acknowledgement if status is "Acknowledgement Pending"
    if status_entry.status != "Acknowledgement Pending":
        return jsonify({"error": "Cannot acknowledge donation at this stage"}), 400

    status_entry.status = "Donation Ongoing"
    try:
        db.session.commit()
        return jsonify({"message": "Acknowledged successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error acknowledging donation: {str(e)}")
        return jsonify({"error": "Database error"}), 500
    
@app.route('/api/status/<int:rid>', methods=["GET"])
@login_required
def get_status_by_rid(rid):
    """Get donation status for a specific request ID"""
    status_entry = DonationStatus.query.filter_by(rid=rid).first()
    
    if status_entry:
        return jsonify({
            "status": status_entry.status,
            "donor_id": status_entry.donor_id
        }), 200
    else:
        return jsonify({
            "status": "Donation Request Listed"
        }), 200



@app.route('/signup', methods=['POST', 'GET'])
def signup():
    if request.method == "POST":
        email = request.form.get('email')
        password = request.form.get('password')
        role = request.form.get('role')

        # Debugging: Log form data
        logging.debug(f"Form data: {request.form}")

        # Validate form data
        if not email or not password or not role:
            flash("All fields are required.", "danger")
            return render_template('signup.html')

        if role not in ["donor", "recipient"]:
            flash("Invalid role selected.", "danger")
            return render_template('signup.html')

        # Check if user already exists
        existing_user = Users.query.filter_by(email=email).first()
        if existing_user:
            flash("Email Already Exists", "warning")
            return render_template('signup.html')

        # Hash the password
        encpassword = generate_password_hash(password)

        new_user=Users(email=email,password=encpassword,role=role)

        try:
            db.session.add(new_user)
            db.session.commit()
            flash("Signup Success! Please Login", "success")
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            logging.error(f"Database error: {str(e)}")
            flash(f"An error occurred: {str(e)}", "danger")
            return render_template('signup.html')

    return render_template('signup.html')


@app.route('/login', methods=['POST', 'GET'])
def login():
    if current_user.is_authenticated:
        role = session.get('role')
        if role == 'donor':
            return redirect(url_for('donor_dashboard'))
        elif role == 'recipient':
            return redirect(url_for('recipient_dashboard'))
    if request.method == "POST":
        email = request.form.get('email')
        password = request.form.get('password')
        selected_role = request.form.get('role')

        # Debugging: Log form data
        logging.debug(f"Form data: {request.form}")

        # Validate form data
        if not email or not password or not selected_role:
            flash("All fields are required.", "danger")
            return render_template('login.html')

        # Check if user exists
        user = Users.query.filter_by(email=email).first()
        if user and check_password_hash(user.password, password):
            if user.role != selected_role:
                flash("Incorrect role selected. Please choose the correct role.", "danger")
                return redirect(url_for('login'))

            # Log the user in
            login_user(user)
            session['role'] = user.role
            flash("Login Success", "primary")

            # Redirect based on role
            if user.role == "donor":
                return redirect(url_for('donor_dashboard'))
            elif user.role == "recipient":
                return redirect(url_for('recipient_dashboard'))
        else:
            flash("Invalid credentials", "warning")
            return render_template('login.html')

    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    session.clear()  # optional
    flash("You have been logged out.", "success")
    return redirect(url_for('login'))


@app.route('/test-db')
def test_db():
    try:
        # Use the text() function to wrap the SQL query
        db.session.execute(text("SELECT 1"))
        return "Database connection successful!"
    except Exception as e:
        return f"Database connection failed: {str(e)}"

# Run Flask Server
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)