from fastapi import FastAPI, Request, Depends, HTTPException, Body
from sqlalchemy.orm import scoped_session, sessionmaker, Session, load_only, joinedload
import requests
import logging
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
global questions_data
questions_data = []
global answers
answers = {} 

class Stt:
    def __init__(self, logger):
        self.logger = logger
#  stt functions
    def convert_video_to_audio(self,video_file, user_directory, video_name):
     try:
        audio_name = "audio_" + video_name
        audio_file = os.path.join(user_directory, f"{audio_name}.mp3")
        ffmpeg_flag = 0
        if ffmpeg_flag == 1:
            ffmpeg_cmd = (
                f"ffmpeg -i {video_file} -map 0:a -acodec libmp3lame {audio_file}"
            )
            subprocess.run(ffmpeg_cmd, shell=True, check=True)
            configdata = {"clientApiKey": sttkey, "input_file": audio_file}
        else:
            configdata = {
                "clientApiKey": sttkey,
                "input_file": video_file,
                "sttid": sttid,
                "modelid": sttmodelid,
            }
        response = requests.post(stt_url + "/stt/server/", json=configdata)
        if response.status_code == 200:
            transcribed_text = response.json()["result"]
        else:
            transcribed_text = ""
        return transcribed_text
     except Exception as e:
        print(f"Error occurred while converting video to audio: {e}")
     return None    


    async def stt(self,data: dict):
     global answers
     print(answers)
     try:
        username = data.get("user_id")
        video = data.get("videos")
        timestamp = data.get("timestamp")
        quesNumber = data.get("quesNumber")
        video.sort()
        if not username or not video:
            raise HTTPException(status_code=400, detail="Invalid request data")
        # backend_api_path = os.path.abspath(os.path.join(os.path.dirname(__file__)))  # Get the absolute path of the Backend_API directory
        backend_api_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "data")
        )
        user_directory = os.path.join(backend_api_path, username)

        for video in video:
            video_path = os.path.join(user_directory, video)
            if os.path.exists(video_path):
                video_destination = video_path
                video_name = os.path.splitext(os.path.basename(video_destination))[0]
                answer = self.convert_video_to_audio(
                    video_destination, user_directory, video_name
                )
                if answer:
                    key = f"{username}_{timestamp}_{quesNumber}"
                    answers[key] = answer

        response_data = {answer}
        return response_data
     except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
     
# chat functions
      
    def llm_accelerator_result_chat(self,username, answer, question):
     try:
        customer_data = {
            "userId": username,
            "modelId": chatmodelId,
            "clientApiKey": clientApiKey,
            "apikey": apikey,
            "promptId": chat_promptId,
            "question": question,
            "audio_text": answer,
        }
        print(customer_data)
        response = requests.post(llm_url + "/llm/server", json=customer_data)

        response.raise_for_status()  # Raise HTTPError for bad responses (4xx and 5xx)

        result = response.text
        return result

     except requests.exceptions.RequestException as e:
        print(f"Error occurred while making the request: {e}")
     except Exception as e:
        print(f"An error occurred in llm_accelerator_result: {e}")

     return None
     
    async def chat(self,data: dict):
     try:
        username = data.get("user_id")  # Modify this according to your needs
        answer = data.get("answer")
        question = data.get("question")

        if not username or not answer or not question:
            raise HTTPException(status_code=400, detail="Invalid request data")

        result = self.llm_accelerator_result_chat(username, answer, question)
        response_data = {result}
        return response_data

     except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
     