from fastapi import FastAPI, Request, Depends, HTTPException, Body
from sqlalchemy.orm import scoped_session, sessionmaker, Session, load_only, joinedload
import requests
from sqlalchemy import func, update, desc, String, distinct
import logging
import re
from postgres import *


config_path = os.path.join(backend_api_path, "config.yaml")

with open(config_path, "r") as config_file:
    config_data = yaml.safe_load(config_file)
    reset = config_data.get("RESET_PASSWORD", {})

    llm = config_data.get("LLM", {})
    stt = config_data.get("STT", {})

    clientApiKey = llm.get("clientApiKey")
    chatmodelId = llm.get("chatmodelId")
    promptmodelId = llm.get("promptmodelId")
    promptId = llm.get("promptId")
    chat_promptId = llm.get("chatPromptId")
    apikey = llm.get("apikey")
    llm_url = llm.get("llm_url")

    sttkey = stt.get("clientApiKey")
    sttid = stt.get("sttid")
    sttmodelid = stt.get("modelid")
    stt_url = stt.get("stt_url")
    ffmpeg_flag = stt.get("ffmpeg_flag")

    MAX_OTP_SEND_ATTEMPTS = reset.get("max_otp_send_attempts")
    OTP_LOCK_DURATION_MINUTES = reset.get("otp_lock_duration_minutes")

    MAX_OTP_ATTEMPTS = reset.get("max_otp_attempts")
    OTP_ATTEMPTS_DURATION_MINUTES = reset.get("otp_attempts_duration_minutes")

    USER_ID_LEN = config_data.get("user_id_length")
    USER_ID_CHUNK_SIZE = config_data.get("user_id_chunk_size")
    postgres_connection_uri_spaces = db.get("postgres_uri_spaces")

def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

SECRET_KEY = "your_secret_key"

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
global answers
answers = {} 

class Llm:
    def __init__(self, logger):
        self.logger = logger

# submit funcionalities
    def llm_accelerator_result(self,username, answer, question_data):
     try:
        customer_data = {
            "userId": username,
            "clientApiKey": clientApiKey,
            "modelId": promptmodelId,
            "apikey": apikey,
            "promptId": promptId,
            "question": question_data,
            "answer": answer,
        }

        response = requests.post(llm_url + "/llm/server", json=customer_data)

        response.raise_for_status()  # Raise HTTPError for bad responses (4xx and 5xx)

        result = response.text
        print(result, 111111)
        pattern = r"(\d{1,3})%"
        match = re.search(pattern, result)
        percentage = match.group(1) if match else None
        return percentage

     except requests.exceptions.RequestException as e:
        print(f"Error occurred while making the request: {e}")
     except Exception as e:
        print(f"An error occurred in llm_accelerator_result: {e}")


    def add_result(self,space_id, hierarchy_id, session_id, qid, result):
     try:
        postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
        postgres_connection_string = str(postgres_connection_uri)

        # Connect to the database directly without checking existence again
        engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
        metadata = MetaData(engine)

        # Find the referred table name
        table_name = f"{hierarchy_id}_transactions"

        with engine.connect() as connection:
            # Check if the table exists
            transaction = connection.begin()
            table_exists = connection.dialect.has_table(connection, table_name)
            print(table_exists)

            if not table_exists:
                return {
                    "message": f"The referred transaction table '{table_name}' does not exist in the database {space_id}"
                }

            transaction_table = Table(table_name, metadata, autoload=True)

            # Use the update method to update the 'result' column
            if result is not None:
                stmt = (
                    update(transaction_table)
                    .where(
                        (transaction_table.c.session_id == session_id)
                        & (transaction_table.c.question_id == qid)
                    )
                    .values(result=result)
                )

                # Execute the update statement
                connection.execute(stmt)
                transaction.commit()
            else:
                print("result is none not updating in database")
            # Retrieve the updated values

     except Exception as e:
        session.rollback()
        print("Error adding result to database:", str(e))

    
    def add_llm_flag(self,space_id, hierarchy_id, session_id, qid, llmflag):
     try:
        postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
        postgres_connection_string = str(postgres_connection_uri)

        # Connect to the database directly without checking existence again
        engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
        metadata = MetaData(engine)

        # Find the referred table name
        table_name = f"{hierarchy_id}_transactions"

        with engine.connect() as connection:
            transaction = connection.begin()

            # Check if the table exists
            table_exists = connection.dialect.has_table(connection, table_name)

            if not table_exists:
                return {
                    "message": f"The referred transaction table '{table_name}' does not exist in the database {space_id}"
                }

            transaction_table = Table(table_name, metadata, autoload=True)

            # Use the update method to update the 'llmflag' column
            stmt = (
                update(transaction_table)
                .where(
                    (transaction_table.c.session_id == session_id)
                    & (transaction_table.c.question_id == qid)
                )
                .values(llm_flag=llmflag)
            )

            # Print the generated SQL statement for debugging

            # Execute the update statement and commit the transaction
            connection.execute(stmt)
            transaction.commit()

     except Exception as e:
        # Rollback the transaction in case of an error
        transaction.rollback()
        print("Error adding LLM flag:", str(e))




    async def submit(self,data: dict, db: Session = Depends(get_db)):
     try:
        user_answers = []
        hierarchy_id = data.get("hierarchy_id")
        username = data.get("username")
        timestamp = data.get("timestamp")

        # Initialize space_id to None
        id = "qid"
        space_id = None
        user = db.query(User).filter(User.username == username).first()
        if user:
            # Access space_id from the user object
            space_id = user.space_id
        else:
            raise HTTPException(status_code=404, detail=f"user not found")
        filtered_keys = [
            key for key in answers.keys() if key.startswith(f"{username}_{timestamp}")
        ]
        filtered_keys.sort()
        for key in filtered_keys:
            user_answer = answers[key]
            user_answers.append(user_answer)

        postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
        postgres_connection_string = str(postgres_connection_uri)

        # Connect to the database directly without checking existence again
        engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
        metadata = MetaData(engine)

        # Find the referred table name
        table_name = f"{hierarchy_id}_questions"
        id = "id"
        question_ids = data.get("qid")

        with engine.connect() as connection:
            # Check if the table exists
            table_exists = connection.dialect.has_table(connection, table_name)
            if not table_exists:
                raise HTTPException(
                    status_code=404, detail=f"transaction table  not found"
                )
            transaction_table = Table(table_name, metadata, autoload=True)
            question_ids = list(map(int, question_ids))
            # Assuming the correct column name is 'question'
            select_query = select([transaction_table.c["question"]]).where(
                transaction_table.c["id"].in_(question_ids)
            )
            # Execute the query and fetch the results
            questions = connection.execute(select_query).fetchall()

        if not questions:
            raise HTTPException(
                status_code=404,
                detail=f" questions are not found in database with the given ids.",
            )

        for answer, qid, question in zip(user_answers, question_ids, questions):
            question_data = {
                "id": qid,
                "question": question.question
                if hasattr(question, "question")
                else None,
                # Add more attributes as needed
            }

            result = self.llm_accelerator_result(username, answer, question_data)
            self.add_result(space_id, hierarchy_id, timestamp, qid, result)
            self.add_llm_flag(space_id, hierarchy_id, timestamp, qid, 1)

        for key in filtered_keys:
            del answers[key]
        response_data = {"message": "LLM models executed successfully"}
        logger.info(f"session created successfully {response_data}")
        return response_data

     except HTTPException as http_exception:
        raise http_exception  # Re-raise HTTPException for proper response
     

    async def chatreset(self,data: dict):
     try:
        user = data.get("user_id")  # Modify this according to your needs
        data = {"clientApiKey": clientApiKey, "userId": user}
        if not user:
            raise HTTPException(status_code=400, detail="Invalid request data")
        response = requests.post(llm_url + "/llm/resetchat", json=data)
        if response.status_code == 200:
            return response.status_code

     except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")    
     