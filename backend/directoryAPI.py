import os
from fastapi import FastAPI, Request, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from postgres import *
import yaml
import logging
import string
from Observability.Dashboard import *
from AI_management.User_Content import *
from AI_management.Stt import *
from AI_management.LLM import *
from User_management.Authentication import *
from User_management.structured_Organization import *
from User_management.Authorization import *


current_directory = os.path.join(os.path.dirname(__file__))
project_directory = os.path.join(current_directory, "..")
configdir = os.path.join(project_directory, "config")
logdir = os.path.join(project_directory, "logs")
log_backenddir = os.path.join(logdir, "backend")
backend_api_path = os.path.abspath(os.path.join(os.path.dirname(__file__)))
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

app = FastAPI()

SECRET_KEY = "your_secret_key"



log_file_path = os.path.join(log_backenddir, "logger.log")
logging.basicConfig(
    filename=log_file_path,  # Set the log file name
    level=logging.INFO,  # Set the desired log level (e.g., logging.DEBUG, logging.INFO)
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


# Configure the logging settings
logger = logging.getLogger(__name__)



global questions_data
questions_data = []

def generate_id(length, chunk_size):
    characters = string.ascii_uppercase + string.digits
    id = "".join(random.choice(characters) for _ in range(length))

    # Insert hyphens after every chunk_size characters
    id_with_hyphens = "-".join(
        id[i : i + chunk_size] for i in range(0, len(id), chunk_size)
    )

    return id_with_hyphens

@app.post("/api/refreshToken")
def refresh_access_token(data: dict = Body(...)):
    auth = Authentication(logger)  # Create an instance of Authentication
    return auth.refresh_access_token(data) 
    

@app.post("/api/create_space")
def create_space(data: dict, db: Session = Depends(get_db)):
    auth =Authentication(logger)
    return auth.create_space(data,db)

@app.post("/api/get_space_data")
def get_spaceids(data: dict = Body(...)):
    struct = Structured_Organization(logger)
    return struct.get_spaceids(data)

@app.post("/api/update_space")
def update_space(data: dict, db: Session = Depends(get_db)):
    struct = Structured_Organization(logger)
    return  struct.update_space(data,db)

@app.post("/api/get_adminUsernames")
def get_adminUsernames(data: dict = Body(...)):
    struct = Structured_Organization(logger)
    return struct.get_adminUsernames(data)

@app.post("/api/get_adminUsernamesWithoutSpace")
def get_adminUsernamesWithoutSpace(data: dict = Body(...)):
    struct = Structured_Organization(logger)
    return struct.get_adminUsernamesWithoutSpace(data)

@app.post("/api/assign_space")
def assign_space_to_admin(
    user_ids: List[str] = Body(...),
    space_id: str = Body(...),
    session: Session = Depends(get_db),
):
    Auth = Authorization(logger)
    return Auth.assign_space_to_admin(user_ids,space_id,session)

@app.post("/api/get_admin_spaceids")
def get_admin_spaceids(data: dict, db: Session = Depends(get_db)):
    struct = Structured_Organization(logger)
    return struct.get_admin_spaceids(data,db)

@app.post("/api/create_hierarchy")
def create_hierarchy(data: dict, db: Session = Depends(get_db)):
    auth = Authentication(logger)
    return auth.create_hierarchy(data,db)

@app.post("/api/get_hierarchy_data")
def admin_view(data: dict, db: Session = Depends(get_db)):
    struct= Structured_Organization(logger)
    return struct.admin_view(data,db)

@app.post("/api/update_hierarchy")
def update_hierarchy(data: dict, db: Session = Depends(get_db)):
   struct = Structured_Organization(logger)
   return struct.update_hierarchy(data,db)

@app.post("/api/get_hierarchy_data_of_space")
def get_hierarchies_by_space_id(data: dict, db: Session = Depends(get_db)):
   struct = Structured_Organization(logger)
   return struct.get_hierarchies_by_space_id(data,db)

@app.post("/api/get_users_of_space")
def get_Usernames(data: dict):
    struct = Structured_Organization(logger)
    return struct.get_Usernames(data)

@app.post("/api/assign_hierarchy")
def assign_hierarchy_to_multiple_users(data: dict, session: Session = Depends(get_db)):
    Auth = Authorization(logger)
    return Auth.assign_hierarchy_to_multiple_users(data,session)

@app.post("/api/upload_questions")
def upload_questions(data: dict, db: Session = Depends(get_db)):
    user_cont = UserContent(logger)
    return user_cont.upload_questions(data,db)

@app.post("/api/get_num_questions")
def get_num_questions(data: dict = Body(...)):
   user_cont = UserContent(logger)
   return  user_cont.get_num_questions(data)

@app.post("/api/available_question_count")
def available_question_count(data: dict):
    user_cont = UserContent(logger)
    return user_cont.available_question_count(data)

@app.post("/api/get_chosen_questions")
def retrieve_questions(data: dict, db: Session = Depends(get_db)):
   user_cont = UserContent(logger)
   return user_cont.retrieve_questions(data,db)


@app.post("/api/reset_question_flags")
def reset_question_flags_endpoint(data: dict):
    user_cont = UserContent(logger)
    return user_cont.reset_question_flags_endpoint(data)

@app.post("/api/summary")
def receive_data(data: dict, db: Session = Depends(get_db)):
    dashboard = Dashboard(logger)
    return dashboard.receive_data(data,db)

@app.post("/api/get_user_hierarchy_names")
def get_user_hierarchy_names(data: dict, db: Session = Depends(get_db)):
    struct = Structured_Organization(logger)
    return struct.get_user_hierarchy_names(data,db)


@app.post("/api/get_users_by_hierarchies")
def get_users_by_hierarchies(data: dict, db: Session = Depends(get_db)):
    struct = Structured_Organization(logger)
    return struct.get_users_by_hierarchies(data,db)



@app.post("/api/dashboard")
def dashboardinfo(data: dict, db: Session = Depends(get_db)):
    dashboard = Dashboard(logger)
    return dashboard.dashboardinfo(data,db)

@app.post("/api/get_sessions")
def get_sessions(data: dict, db: Session = Depends(get_db)):
    dashboard = Dashboard(logger)
    return dashboard.get_sessions(data,db)

@app.post("/api/get_user_details")
def get_user_details(data: dict, db: Session = Depends(get_db)):
    struct = Structured_Organization(logger)
    return struct.get_user_details(data,db)

@app.post("/api/active_admins")
def active_admins(data: dict = Body(...), db: Session = Depends(get_db)):
    Auth = Authorization(logger)
    return Auth.active_admins(data,db)

@app.post("/api/active_users")
def active_users(data: dict, db: Session = Depends(get_db)):
    struct = Structured_Organization(logger)
    return struct.active_users(data,db)

@app.post("/api/register")
def api_register(details: dict, db: Session = Depends(get_db)):
    auth = Authentication(logger)
    return auth.api_register(details , db)

@app.post("/api/validateTokens")
async def validateTokens(request_data: dict = Body(...), db: Session = Depends(get_db)):
    auth = Authentication(logger)
    return auth.create_hierarchy(request_data,db)

@app.post("/api/login")
async def login(request_data: dict = Body(...), db: Session = Depends(get_db)):
    auth = Authentication(logger)  # Create an instance of Authentication
    return await auth.login(request_data, db)  # Call the login method on the instance and await its result




# Log out route


@app.post("/api/logout")
async def logout(request_data: dict = Body(...), db: Session = Depends(get_db)):
   auth = Authentication(logger)
   return await auth.logout(request_data,db)

class EmailInput(BaseModel):
    email: str


class OTPInput(BaseModel):
    email: str
    otp: str


class NewPasswordInput(BaseModel):
    email: str
    new_password: str


class SimulatedSession:
    def query(self, model):
        return self

    def filter_by(self, **kwargs):
        return self

    def first(self):
        # Simulate fetching a user from the database
        return None  # Replace with actual user object

    def commit(self):
        # Simulate committing changes to the database
        pass


    
@app.post("/reset_password")
async def reset_password(data: EmailInput):
    auth = Authentication(logger)
    try:
        result = await auth.reset_password(data)
        return result
    except HTTPException as e:
        return e


@app.post("/verify_otp")
def verify_otp(data: dict):
   auth = Authentication(logger)
   return auth.verify_otp(data)

# Route to update password
@app.post("/update_password")
def update_password(data: dict):
   auth = Authentication(logger)
   return auth.update_password(data)


@app.post("/api/stt")
async def stt(data: dict):
    stt_call = Stt(logger)
    return await stt_call.stt(data)


@app.post("/api/chat")
async def chat(data: dict):
    stt_call = Stt(logger)
    return await stt_call.chat(data)

@app.post("/api/submit")
async def submit(data: dict, db: Session = Depends(get_db)):
  llm_call = Llm(logger)
  return await llm_call.submit(data,db)


@app.post("/api/chatreset")
async def chatreset(data: dict):
  llm_call = Llm(logger)
  return await llm_call.chatreset(data)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5001)

