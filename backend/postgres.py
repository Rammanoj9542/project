import os
from sqlalchemy import create_engine
from sqlalchemy import inspect
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import scoped_session, sessionmaker, Session, load_only
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    MetaData,
    ForeignKey,
    Table,
    text,
    or_,
    exists,
    cast,
    inspect,
    and_,
    select,
    exc,
)
import random
from random import shuffle
from models import *
from datetime import datetime, timedelta
import yaml
import subprocess
import psycopg2
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from cachetools import TTLCache
import string
import uuid

ttl_seconds = 100 * 365 * 24 * 60 * 60
cache = TTLCache(maxsize=100, ttl=ttl_seconds)

backend_api_path = os.path.abspath(os.path.join(os.path.dirname(__file__)))
config_path = os.path.join(backend_api_path, "config.yaml")

with open(config_path, "r") as config_file:
    config_data = yaml.safe_load(config_file)
    db = config_data.get("DB", {})
    postgres_connection_uri = db.get("postgres_uri")
    postgres_connection_uri_spaces = db.get("postgres_uri_spaces")
    no_of_questions = config_data.get("no_of_questions")
    USER_ID_LEN = config_data.get("user_id_length")
    USER_ID_CHUNK_SIZE = config_data.get("user_id_chunk_size")

# Create the SQLAlchemy engine
try:
    engine = create_engine(postgres_connection_uri)
    engine.connect()
    print("Connection to the database successful.")
except OperationalError as e:
    print(str(e))
    print(f"Error connecting to the database: {e}")


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
try:
    inspector = inspect(engine)
except OperationalError as e:
    print(str(e))
    print(f"Error inspector: {e}")


if not inspector.has_table("questions"):
    Base.metadata.create_all(engine)

if not inspector.has_table("users"):
    Base.metadata.create_all(engine)

if not inspector.has_table("transactions"):
    Base.metadata.create_all(engine)

existing_questions = session.query(Question).all()
existing_question_texts = [question.question for question in existing_questions]

# Generate a list of unique qid values for the range 1000 to 9999
unique_qids = list(range(1, 1001))


projectdirectory = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
configdirectory = os.path.join(projectdirectory, "config")
yaml_file_path = os.path.join(configdirectory, "questions.yaml")
print(f"yaml_file_path: {yaml_file_path}")


# Initialize an empty topics dictionary
topics = {}

# Read questions from the YAML file
with open(yaml_file_path, "r") as yaml_file:
    yaml_data = yaml.safe_load(yaml_file)
    topics_data = yaml_data.get("topics", [])

    # Iterate over the topics and their questions
    for topic_data in topics_data:
        topic_name = topic_data.get("category")
        questions = topic_data.get("questions", [])

        # Assign the questions to the topic in the desired format
        topics[topic_name] = questions

shuffled_topics = list(topics.keys())
shuffle(shuffled_topics)

# Shuffle the list of unique qids
shuffle(unique_qids)

# Insert new questions using the shuffled topics and qids
# for topic in shuffled_topics:
#     questions = topics[topic]
#     for question in questions:
#         if question not in existing_question_texts:
#             if not unique_qids:
#                 print("Ran out of unique qid values.")
#                 break

#             random_qid = unique_qids.pop(0)  # Get the next shuffled qid value
#             question_obj = Question(
#                 qid=random_qid, question=question, question_type=topic
#             )
#             session.add(question_obj)

# Commit the changes to the database
session.commit()

cache_latest_key = "latest_number"
cached_latest_data = cache.get(cache_latest_key)
if not cached_latest_data:
    latest_number = session.query(func.max(Question.selected_flag)).scalar()
    print(latest_number)
    if latest_number:
        cache[cache_latest_key] = latest_number
    else:
        cache[cache_latest_key] = 0


def get_random_questions(num_questions):
    cache_latest_key = "latest_number"
    cached_latest_data = cache.get(cache_latest_key)

    previous_questions = (
        session.query(Question).filter(Question.selected_flag == 0).all()
    )
    print(previous_questions)

    if previous_questions:
        latest_number = cached_latest_data
        for q in previous_questions:
            q.selected_flag = latest_number + 1
        cache[cache_latest_key] = latest_number + 1
        print(cached_latest_data)

    # Get all questions and filter out those already selected
    remaing_questions = (
        session.query(Question).filter(Question.selected_flag == None).all()
    )

    print(remaing_questions)
    # Select random questions
    selected_questions = random.sample(remaing_questions, num_questions)
    print(selected_questions)

    # Update flags

    for q in selected_questions:
        q.selected_flag = 0

    session.commit()

    return selected_questions


def get_selected_questions():
    selected_question = (
        session.query(Question).filter(Question.selected_flag == 0).all()
    )
    if not selected_question:
        selected_question = get_random_questions(no_of_questions)
    return selected_question


def reset_question_flags():
    session.query(Question).update({Question.selected_flag: None})
    session.commit()


def get_available_question_count():
    return session.query(Question).filter(Question.selected_flag == None).count()


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


# def create_transaction(
#    space_id,hierarchy_id, user_id, session_id, qid, videoflag=None, promptflag=None, llmflag=None
# ):
    


#     user = db.query(User).filter(User.user_id == user_id).first()
#     if user:
#         # Access space_id from the user object
#         space_id = user.space_id

#     # Create the PostgreSQL connection string
#     postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
#     postgres_connection_string = str(postgres_connection_uri)

#     # Connect to the database directly without checking existence again
#     engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
#     metadata = MetaData(engine)

#     # find table name
#     table_name = f"{hierarchy_id}_transactions"

#     with engine.connect() as connection:
#         # Check if the table exists
#         table_exists = connection.dialect.has_table(connection, table_name)

#         if not table_exists:
#             return {
#                 "message": f"The transaction table '{table_name}' does not exist in the database {space_id}"
#             }

#     try:
#         transaction = Transaction(
#             user_id=user_id,
#             session_id=session_id,
#             question_id=qid,
#             videoflag=videoflag,
#             promptflag=promptflag,
#             llmflag=llmflag,
#         )
#         session.add(transaction)
#         session.commit()
#         print("Transaction created successfully.")
#     except Exception as e:
#         session.rollback()  # Rollback the transaction in case of an error
#         print("Error creating transaction:", str(e))


# def create_transaction(
#     space_id, hierarchy_id, user_id, session_id, qid, videoflag=None, promptflag=None, llmflag=None 
# ):
#     user = db.query(User).filter(User.user_id == user_id).first()
#     if user:
#         # Access space_id from the user object
#         space_id = user.space_id

#     # Create the PostgreSQL connection string
#     postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
#     postgres_connection_string = str(postgres_connection_uri)

#     # Connect to the database directly without checking existence again
#     engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
#     metadata = MetaData(engine)

#     # Find the referred table name
#     table_name = f"{hierarchy_id}_transactions"

#     with engine.connect() as connection:
#         # Check if the table exists
#         table_exists = connection.dialect.has_table(connection, table_name)

#         if not table_exists:
#             return {
#                 "message": f"The referred transaction table '{table_name}' does not exist in the database {space_id}"
#             }
#         transaction_table = Table(table_name, metadata, autoload=True)
#     try:
#         # Assuming the referred table has columns like 'user_id', 'session_id', 'question_id', 'videoflag', 'promptflag', 'llmflag'
#         transaction_table = transaction_table(
#             user_id=user_id,
#             session_id=session_id,
#             question_id=qid,
#             videoflag=videoflag,
#             promptflag=promptflag,
#             llmflag=llmflag,
#         )
#         session.add(transaction_table)
#         session.commit()
#         print("Referred transaction created successfully.")
#     except Exception as e:
#         session.rollback()  # Rollback the transaction in case of an error
#         print("Error creating referred transaction:", str(e))







def add_video_flag(username, session_id, qid, videoflag):
    try:
        transaction = (
            session.query(Transaction)
            .filter_by(username=username, session_id=session_id, question_id=qid)
            .first()
        )
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
        transaction = (
            session.query(Transaction)
            .filter_by(username=username, session_id=session_id, question_id=qid)
            .first()
        )
        if transaction:
            transaction.promptflag = promptflag
            session.commit()
            print("Prompt flag added successfully.")
        else:
            print("Transaction not found.")
    except Exception as e:
        session.rollback()
        print("Error adding prompt flag:", str(e))


# def add_llm_flag(username, session_id, qid, llmflag):
#     try:
#         transaction = (
#             session.query(Transaction)
#             .filter_by(username=username, session_id=session_id, question_id=qid)
#             .first()
#         )
#         if transaction:
#             transaction.llmflag = llmflag
#             session.commit()
#             print("LLM flag added successfully.")
#         else:
#             print("Transaction not found.")
#     except Exception as e:
#         session.rollback()
#         print("Error adding LLM flag:", str(e))


# def add_result(userid, session_id, qid, result):
#     try:
      


#         transaction = (
#             session.query(Transaction)
#             .filter_by(userid=userid, session_id=session_id, question_id=qid)
#             .first()
#         )
#         if transaction:
#             # Assuming you have a 'result' column in the Transaction table
#             transaction.result = result
#             session.commit()
#             print("Result added to database successfully.")
#         else:
#             print("Transaction not found.")
#     except Exception as e:
#         session.rollback()
#         print("Error adding result to database:", str(e))


def create_db_questions_file(question_data_list):
    config_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "config")
    )
    formatted_questions = ""
    for question_data in question_data_list:
        qid = question_data["qid"]
        question = question_data["question"]
        # question_type = question_data["question_type"]
        formatted_questions += f"Question ID: {qid} "

        formatted_questions += f"Question: {question}\n"
    dbquestions_path = os.path.join(config_path, "dbquestions.txt")
    with open(dbquestions_path, "w") as file:
        file.write(formatted_questions)


# User login route


def generate_id(length, chunk_size):
    characters = string.ascii_uppercase + string.digits
    id = "".join(random.choice(characters) for _ in range(length))

    # Insert hyphens after every chunk_size characters
    id_with_hyphens = "-".join(
        id[i : i + chunk_size] for i in range(0, len(id), chunk_size)
    )

    return id_with_hyphens


def create_user(
    username, password, email, role, firstname=None, lastname=None, contact_number=None
):
    flag = 0

    while flag == 0:
        user_id = generate_id(USER_ID_LEN, USER_ID_CHUNK_SIZE)
        execting_user_ids = session.query(User).filter_by(user_id=user_id).all()
        if not execting_user_ids:
            flag = 1
    hashed_password = generate_password_hash(password, method="pbkdf2:sha256")
    new_user = User(
        user_id=user_id,
        username=username,
        password=hashed_password,
        email=email,
        role=role,
        firstname=firstname,
        lastname=lastname,
        contact_number=contact_number,
        space_id="",
        hierarchy_ids=[],
    )
    session.add(new_user)
    # Create instances for associated tables
    new_user_attributes = UserAttributes(user_id=user_id)
    new_user_authentication = UserAuthentication(user_id=user_id)
    new_refresh_token = RefreshToken(user_id=user_id)

    # Add instances to the session
    session.add(new_user_attributes)
    session.add(new_user_authentication)
    session.add(new_refresh_token)
    session.commit()
    return new_user
