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
    food_item = db.Column(db.String(100))
    quantity = db.Column(db.Integer)
    location = db.Column(db.String(300))
    expiry_time = db.Column(db.DateTime)
    description = db.Column(db.String(300))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))


class Users(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(1000), nullable=False)  # Hashed password
    role = db.Column(db.String(20), nullable=False)  # "donor" or "recipient"


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
        food_item = request.form.get('food_item')
        quantity = request.form.get('quantity')
        location = request.form.get('location')
        expiry_time = request.form.get('date-time')
        description = request.form.get('description')

        expiry_dt = datetime.strptime(expiry_time, "%Y-%m-%dT%H:%M")

        new_request = Recipient(
            food_item=food_item,
            quantity=quantity,
            location=location,
            expiry_time=expiry_dt,
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
            "food_item": req.food_item,
            "quantity": req.quantity,
            "location": req.location,
            "expiry_time": req.expiry_time.strftime("%Y-%m-%d %I:%M %p"),
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
        req.food_item = data.get("food_item", req.food_item)
        req.quantity = data.get("quantity", req.quantity)
        req.location = data.get("location", req.location)
        req.expiry_time = data.get("expiry_time", req.expiry_time)
        req.desc = data.get("desc", req.desc)
        db.session.commit()
        return jsonify({"message": "Updated"}), 200
    return jsonify({"error": "Unauthorized"}), 403

@app.route('/api/all_requests', methods=["GET"])
@login_required
def get_all_requests():
    if current_user.role != 'donor':
        return jsonify({"error": "Unauthorized access"}), 403

    all_requests = Recipient.query.all()
    data = []
    for req in all_requests:
        data.append({
            "id": req.rid,
            "food_item": req.food_item,
            "quantity": req.quantity,
            "location": req.location,
            "expiry_time": req.expiry_time.strftime("%Y-%m-%d %I:%M %p"),
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