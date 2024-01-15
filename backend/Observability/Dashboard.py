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

class Dashboard:
    def __init__(self, logger):
     self.logger = logger

    def get_sessions(self,data: dict, db: Session = Depends(get_db)):
     try:
        username = data.get("username")
        hierarchy_id = data.get("hierarchy_id")

        additional_fields = set(data.keys()) - {"username", "hierarchy_id"}
        if additional_fields:
            raise HTTPException(
                status_code=400,
                detail="Additional fields in the request are not allowed",
            )

        # Check if the username is not in the database
        user = db.query(User).filter(User.username == username).first()
        if user:
            # Access space_id from the user object
            space_id = user.space_id
            user_id = user.user_id
        print(space_id)
        if not user:
            raise HTTPException(
                status_code=404, detail=f"Username not found: {username}"
            )
        postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
        postgres_connection_string = str(postgres_connection_uri)

        # Connect to the database directly without checking existence again
        engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
        metadata = MetaData(engine)

        # Find the referred table name
        table_name = f"{hierarchy_id}_transactions"

        with engine.connect() as connection:
            # Check if the table exists
            table_exists = connection.dialect.has_table(connection, table_name)
            if not table_exists:
                return {
                    "message": f"The referred transaction table '{table_name}' does not exist in the database {space_id}"
                }

            transaction_table = Table(table_name, metadata, autoload=True)
            select_query = select([distinct(transaction_table.c["session_id"])]).where(
                transaction_table.c["user_id"] == user_id
            )

            # Execute the query and fetch all results
            sessions = connection.execute(select_query).fetchall()
        # Check if any additional fields are present in the request

        session_options = "".join(
            [
                f'<option value="{session[0]}">{session[0]}</option>'
                for session in sessions
            ]
        )
        logger.info(f"session data = {session_options}")
        return {session_options}
     except HTTPException as http_exception:
        # Reraise HTTPExceptions so that they are not caught by the generic Exception handler
        raise http_exception
     except Exception as e:
        logger.error(f"an error occured {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")
     
# receive data function
    def create_transaction(self,
     space_id,
     hierarchy_id,
     user_id,
     session_id,
     qid,
     videoflag=None,
     promptflag=None,
     llmflag=None,
     db: Session = Depends(get_db),
 ):
     user = db.query(User).filter(User.user_id == user_id).first()
     if user:
        # Access space_id from the user object
        space_id = user.space_id

    # Create the PostgreSQL connection string
     postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
     postgres_connection_string = str(postgres_connection_uri)

     # Connect to the database directly without checking existence again
     engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
     metadata = MetaData(engine)

     # Find the referred table name
     table_name = f"{hierarchy_id}_transactions"

     with engine.connect() as connection:
        # Check if the table exists
        table_exists = connection.dialect.has_table(connection, table_name)
        if not table_exists:
            return {
                "message": f"The referred transaction table '{table_name}' does not exist in the database {space_id}"
            }

        transaction_table = Table(table_name, metadata, autoload=True)

     try:
        # Assuming the referred table has columns like 'user_id', 'session_id', 'question_id', 'videoflag', 'promptflag', 'llmflag'
        ins = transaction_table.insert().values(
            user_id=user_id,
            session_id=session_id,
            question_id=qid,
            video_flag=videoflag,
            prompt_flag=promptflag,
            llm_flag=llmflag,
        )

        # Use the 'ins' object to execute the insertion
        with engine.connect() as connection:
            connection.execute(ins)
     finally:
        pass


    def receive_data(self,data: dict, db: Session = Depends(get_db)):
     try:
        # Define a set of expected keys in the request JSON body
        hierarchy_id = data.get("hierarchy_id")
        user_id = data.get("user_id")
        session_id = data.get("session_id")
        qid = data.get("question_id")
        saved_flag = data.get("question_saved_flag")
        prompt_flag = data.get("prompt_flag")
        llm_flag = data.get("llm_flag")

        # Initialize space_id to None
        space_id = None

        user = db.query(User).filter(User.user_id == user_id).first()
        if user:
            # Access space_id from the user object
            space_id = user.space_id

        # Use the data to create a transaction using your asynchronous create_transaction function
        self.create_transaction(
            space_id,
            hierarchy_id,
            user_id,
            session_id,
            qid,
            saved_flag,
            prompt_flag,
            llm_flag,
            db,
        )
        logger.info("Data received and transaction created successfully")

        return "Data received and transaction created successfully"

     except HTTPException as http_exception:
        # Reraise HTTPExceptions so that they are not caught by the generic Exception handler
        raise http_exception
     
# dashboard functionality 
    def dashboardinfo(self,data: dict, db: Session = Depends(get_db)):
     try:
        # Check if 'username' and 'session_id' are present in the request data
        if "username" not in data or "session_id" not in data:
            raise HTTPException(
                status_code=400, detail="Both 'username' and 'session_id' are required"
            )

        username = data.get("username")
        hierarchy_id = data.get("hierarchy_id")
        session_id = data.get("session_id")

        user = db.query(User).filter(User.username == username).first()
        if user:
            # Access space_id from the user object
            space_id = user.space_id
        print(user)
        print(space_id)
        postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
        postgres_connection_string = str(postgres_connection_uri)

        # Connect to the database directly without checking existence again
        engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
        metadata = MetaData(engine)

        # Find the referred table name
        table_name = f"{hierarchy_id}_transactions"

        with engine.connect() as connection:
            # Check if the table exists
            table_exists = connection.dialect.has_table(connection, table_name)
            if not table_exists:
                return {
                    "message": f"The referred transaction table '{table_name}' does not exist in the database {space_id}"
                }

            transaction_table = Table(table_name, metadata, autoload=True)

            select_query = select([transaction_table]).where(
                transaction_table.c["session_id"] == session_id
            )

            # Execute the query and fetch all results
            result = connection.execute(select_query).fetchall()

            # Check if any results were found
            if not result:
                # If no data is found in the database, raise a 404 Not Found error
                raise HTTPException(status_code=404, detail="Data not found")

            # Process the result
            transaction_data = []

            for row in result:
                transaction_item = {
                    "username": row["user_id"],
                    "sessionId": row["session_id"],
                    "questionId": row["question_id"],
                    "videoFlag": row["video_flag"],
                    "promptFlag": row["prompt_flag"],
                    "llmFlag": row["llm_flag"],
                    "result": row["result"],
                    # Add more columns as needed
                }
                transaction_data.append(transaction_item)

            logger.info(f"transactions {transaction_data}")
            return {"transactions": transaction_data}
     except HTTPException as http_exception:
        # Re-raise HTTPExceptions so that they are not caught by the generic Exception handler
        raise http_exception
     except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch Transactions: {str(e)}"  
        )