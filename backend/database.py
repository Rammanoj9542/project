import os
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy import inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
import random
from random import shuffle
from models import *
import jwt
from datetime import datetime, timedelta
from functools import wraps
import yaml
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib


interview_fullstack_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'db'))
#print ("interview_fullstack_path: "+interview_fullstack_path)
database_path = os.path.join(interview_fullstack_path, 'questions.db')
#print ("database_path: "+interview_fullstack_path)
engine = create_engine(f"sqlite:///{database_path}", echo=True)

# Create a session to interact with the database
Session = sessionmaker(bind=engine)
session = Session()


def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()


# Check if the table "questions" exists in the database
inspector = inspect(engine)
if not inspector.has_table("questions"):
    Base.metadata.create_all(engine)

if not inspector.has_table("users"):
    Base.metadata.create_all(engine)

if not inspector.has_table("transactions"):
    Base.metadata.create_all(engine)

existing_questions = session.query(Question).all()
existing_question_texts = [
    question.question for question in existing_questions]

# Generate a list of unique qid values for the range 1000 to 9999
unique_qids = list(range(1, 1001))


projectdirectory = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
configdirectory = os.path.join(projectdirectory,"config")
yaml_file_path = os.path.join(configdirectory,"questions.yaml")

# Initialize an empty topics dictionary
topics = {}

# Read questions from the YAML file
with open(yaml_file_path, 'r') as yaml_file:
    yaml_data = yaml.safe_load(yaml_file)
    topics_data = yaml_data.get('topics', [])
    
    # Iterate over the topics and their questions
    for topic_data in topics_data:
        topic_name = topic_data.get('category')
        questions = topic_data.get('questions', [])
        
        # Assign the questions to the topic in the desired format
        topics[topic_name] = questions

shuffled_topics = list(topics.keys())
shuffle(shuffled_topics)

# Shuffle the list of unique qids
shuffle(unique_qids)

# Insert new questions using the shuffled topics and qids
for topic in shuffled_topics:
    questions = topics[topic]
    for question in questions:
        if question not in existing_question_texts:
            if not unique_qids:
                print("Ran out of unique qid values.")
                break

            random_qid = unique_qids.pop(0)  # Get the next shuffled qid value
            question_obj = Question(
                qid=random_qid, question=question, question_type=topic)
            session.add(question_obj)

# Commit the changes to the database
session.commit()


def get_random_questions(num_questions):

    # Get all questions and filter out those already selected
    all_questions = session.query(Question).filter(
        Question.selected_flag == 0).all()

    if num_questions > len(all_questions):
        session.query(Question).update({Question.selected_flag: 0})
        all_questions = session.query(Question).filter(
            Question.selected_flag == 0).all()

    # Reset flags if no more questions available
    if len(all_questions) == 0:
        session.query(Question).update({Question.selected_flag: 0})
        all_questions = session.query(Question).filter(
            Question.selected_flag == 0).all()

    # Select random questions
    selected_questions = random.sample(all_questions, num_questions)

    # Update flags
    for q in selected_questions:
        q.selected_flag = 1

    session.commit()

    return selected_questions


def reset_question_flags():
    session.query(Question).update({Question.selected_flag: 0})
    session.commit()


def get_available_question_count():
    return session.query(Question).filter(Question.selected_flag == 0).count()

def get_questions_by_qid(qid_list):
    try:
        # Query the database to retrieve questions by qid
        questions = session.query(Question).filter(Question.qid.in_(qid_list)).all()
        
        return questions
    except Exception as e:
        # Handle any exceptions or errors here
        print(f"Error: {e}")
        return []

def update_question(qid, new_question):
    # Retrieve the question with the given qid
    question = session.query(Question).filter_by(qid=qid).first()

    if question:
        # Update the question
        question.question = new_question
        session.commit()
        print(f"Question with qid {qid} updated successfully.")
    else:
        print(f"Question with qid {qid} not found.")


def delete_question(qid):
    # Retrieve the question with the given qid
    question = session.query(Question).filter_by(qid=qid).first()

    if question:
        # Delete the question
        session.delete(question)
        session.commit()
        print(f"Question with qid {qid} deleted successfully.")
    else:
        print(f"Question with qid {qid} not found.")


def create_transaction(username, session_id, qid, videoflag=None, promptflag=None, llmflag=None):
    try:
        transaction = Transaction(username=username, session_id=session_id, question_id=qid,
                                  videoflag=videoflag, promptflag=promptflag, llmflag=llmflag)
        session.add(transaction)
        session.commit()
        print("Transaction created successfully.")
    except Exception as e:
        session.rollback()  # Rollback the transaction in case of an error
        print("Error creating transaction:", str(e))


def add_video_flag(username, session_id, qid, videoflag):
    try:
        transaction = session.query(Transaction).filter_by(
            username=username, session_id=session_id, question_id=qid).first()
        if transaction:
            transaction.videoflag = videoflag
            session.commit()
            print("Video flag added successfully.")
        else:
            print("Transaction not found.")
    except Exception as e:
        session.rollback()
        print("Error adding video flag:", str(e))


def add_prompt_flag(username, session_id, qid, promptflag):
    try:
        transaction = session.query(Transaction).filter_by(
            username=username, session_id=session_id, question_id=qid).first()
        if transaction:
            transaction.promptflag = promptflag
            session.commit()
            print("Prompt flag added successfully.")
        else:
            print("Transaction not found.")
    except Exception as e:
        session.rollback()
        print("Error adding prompt flag:", str(e))


def add_llm_flag(username, session_id, qid, llmflag):
    try:
        transaction = session.query(Transaction).filter_by(
            username=username, session_id=session_id, question_id=qid).first()
        if transaction:
            transaction.llmflag = llmflag
            session.commit()
            print("LLM flag added successfully.")
        else:
            print("Transaction not found.")
    except Exception as e:
        session.rollback()
        print("Error adding LLM flag:", str(e))


def read_videoflag(username, session_id, qid):
    try:
        transaction = session.query(Transaction).filter_by(
            username=username, session_id=session_id, question_id=qid).first()
        if transaction:
            videoflag = transaction.videoflag
            return videoflag
        else:
            return None
    except Exception as e:
        print("Error reading videoflag:", str(e))
        return None


def read_promptflag(username, session_id, qid):
    try:
        transaction = session.query(Transaction).filter_by(
            username=username, session_id=session_id, question_id=qid).first()
        if transaction:
            promptflag = transaction.promptflag
            return promptflag
        else:
            return None
    except Exception as e:
        print("Error reading promptflag:", str(e))
        return None


def read_llmflag(username, session_id, qid):
    try:
        transaction = session.query(Transaction).filter_by(
            username=username, session_id=session_id, question_id=qid).first()
        if transaction:
            llmflag = transaction.llmflag
            return llmflag
        else:
            return None
    except Exception as e:
        print("Error reading llmflag:", str(e))
        return None


def add_result(username, session_id, qid, result):
    try:
        transaction = session.query(Transaction).filter_by(
            username=username, session_id=session_id, question_id=qid).first()
        if transaction:
            # Assuming you have a 'result' column in the Transaction table
            transaction.result = result
            session.commit()
            print("Result added to database successfully.")
        else:
            print("Transaction not found.")
    except Exception as e:
        session.rollback()
        print("Error adding result to database:", str(e))


def read_result(username, session_id, qid):
    try:
        transaction = session.query(Transaction).filter_by(
            username=username, session_id=session_id, question_id=qid).first()
        if transaction:
            result = transaction.result
            return result
        else:
            return None
    except Exception as e:
        print("Error reading LLM result:", str(e))
        return None


# Close the session
session.close()

# Close the session
session.close()


# def get_random_questions(num_questions):
#     # Retrieve all questions and their types from the database
#     all_questions = session.query(Question.qid, Question.question, Question.question_type).all()

#     # Organize questions by question type
#     questions_by_type = {}
#     for qid, question, question_type in all_questions:
#         if question_type not in questions_by_type:
#             questions_by_type[question_type] = []
#         questions_by_type[question_type].append({
#             'qid': qid,
#             'question': question,
#             'question_type': question_type
#         })

#     selected_questions = []
#     selected_types = set()

#     while len(selected_questions) < num_questions and questions_by_type:
#         available_types = list(questions_by_type.keys())
#         random.shuffle(available_types)

#         for question_type in available_types:
#             if question_type not in selected_types:
#                 available_questions = questions_by_type[question_type]
#                 random.shuffle(available_questions)
#                 selected_question = available_questions.pop()
#                 selected_questions.append(selected_question)
#                 selected_types.add(question_type)

#                 if not available_questions:
#                     del questions_by_type[question_type]

#                 if len(selected_questions) == num_questions:
#                     break

#         # If all question types have been used, restart with an empty set
#         if len(selected_types) == len(questions_by_type):
#             selected_types = set()

#     return selected_questions

def choose_questions(num_questions):
    # Retrieve all questions from the database
    all_questions = session.query(
        Question.qid, Question.question, Question.question_type).all()

    print("Available Questions:")
    for qid, question, question_type in all_questions:
        print(f"{qid}. {question}")

    selected_qids = []
    while len(selected_qids) < num_questions:
        try:
            qid = int(
                input(f"Choose question {len(selected_qids) + 1} (Enter qid): "))
            if qid in selected_qids:
                print("Question already selected. Choose a different question.")
            elif qid not in [q[0] for q in all_questions]:
                print("Invalid qid. Please choose a valid question.")
            else:
                selected_qids.append(qid)
        except ValueError:
            print("Invalid input. Please enter a valid qid.")

    selected_questions = []
    for qid, question, question_type in all_questions:
        if qid in selected_qids:
            selected_questions.append({
                'qid': qid,
                'question': question,
                'question_type': question_type
            })
    return selected_questions


def create_db_questions_file(question_data_list):
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config'))
    formatted_questions = ""
    for question_data in question_data_list:
        qid = question_data['qid']
        question = question_data['question']
        question_type = question_data['question_type']
        formatted_questions += f"Question ID: {qid} "

        formatted_questions += f"Question: {question}\n"
    dbquestions_path = os.path.join(config_path, 'dbquestions.txt')
    with open(dbquestions_path, "w") as file:
        file.write(formatted_questions)


def signup_user(data: dict, db: Session):
    try:
        user_details = data['details']  # Extract details dictionary

        # Check if the username already exists
        existing_user = db.query(User).filter_by(
            username=user_details['username']).first()

        if existing_user:
            raise IntegrityError('Username already registered', None, None)

        # Check if the email already exists
        existing_email = db.query(User).filter_by(
            email=user_details['email']).first()

        if existing_email:
            raise IntegrityError('Email already registered', None, None)

        # Hash the password
        hashed_password = generate_password_hash(
            user_details['password'], method='pbkdf2:sha256')

        # Create a new user
        new_user = User(
            username=user_details['username'],
            password=hashed_password,
            email=user_details['email'],
            firstname=user_details['firstName'],
            lastname=user_details['lastName'],
            contact_number=user_details['contactNumber'],
            roles=json.dumps([user_details['role']])  # Close the json.dumps() call correctly
        )

        db.add(new_user)
        db.commit()

        return {'message': 'User registered successfully'}, 200

    except IntegrityError as e:
        db.rollback()  # Rollback the session in case of an integrity error
        return {'message': str(e)}, 400  # Return the IntegrityError message

    except Exception as e:
        db.rollback()  # Rollback the session in case of any other error
        return {'message': f'An error occurred: {str(e)}'}, 500
# User login route


def add_refresh_token_to_db(refresh_token):
    # Add and commit the new_refresh_token to the database
    session.add(refresh_token)
    session.commit()


def create_refresh_token(user, token):
    new_refresh_token = RefreshToken(user_id=user.user_id, token=token)
    session.add(new_refresh_token)
    session.commit()

# Retrieve a refresh token by its token value


def get_refresh_token_by_token(token):
    return RefreshToken.query.filter_by(token=token).first()

# Update a refresh token in the database


def update_refresh_token(refresh_token):
    session.commit()

# Delete a refresh token from the database


def delete_refresh_token(user):
    refresh_token = session.query(RefreshToken).filter_by(
        user_id=user.user_id).first()
    if refresh_token:
        session.delete(refresh_token)
        session.commit()
        return True
    return False

# Function to generate and store refresh token


def generate_refresh_token(user):
    # Set the expiration time for the token
    expiration_time = datetime.utcnow() + timedelta(days=30)
    refresh_token_payload = {
        'public_id': user.id,
        'exp': expiration_time
    }


def get_user_by_username(username):
    return session.query(User).filter_by(username=username).first()


def verify_otp(data, session):
    user = session.query(User).filter_by(email=data['email']).first()
    if not user:
        return {'status': 'error', 'message': 'Email not registered'}

    if user.temp_otp == data['otp']:
        # Here, you can add the logic to clear the temporary OTP or mark it as used if needed
        return {'status': 'success', 'message': 'OTP verified'}
    else:
        return {'status': 'error', 'message': 'Invalid OTP'}


def update_password(data, session):
    user = session.query(User).filter_by(email=data['email']).first()
    if not user:
        return {'status': 'error', 'message': 'Email not registered'}

    new_password = data['new_password']
    user.password = generate_password_hash(new_password, method='pbkdf2:sha256')
    session.commit()

    return {'status': 'success', 'message': 'Password updated successfully'}


def create_user(username, password, email, roles, firstname=None, lastname=None, contact_number=None):
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    roles_json = json.dumps(roles)
    new_user = User(
        username=username,
        password=hashed_password,
        email=email,
        roles=roles_json,
        firstname=firstname,
        lastname=lastname,
        contact_number=contact_number,
    )
    session.add(new_user)
    session.commit()
    return new_user


def check_user_roles(user):
    roles = json.loads(user.roles)

    if 'admin' in roles and 'user' in roles:
        return 'both'
    elif 'admin' in roles:
        return 'admin'
    elif 'user' in roles:
        return 'user'
    else:
        return 'none'
