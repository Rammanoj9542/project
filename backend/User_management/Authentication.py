from fastapi import FastAPI, Request, Depends, HTTPException, Body
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import BaseModel, Field
from sqlalchemy.orm import scoped_session, sessionmaker, Session, load_only, joinedload
from postgres import *
import logging
from jose import JWTError, jwt
from random import randint

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

    ACCESS_TOKEN_EXPIRE_MINUTES = reset.get("access_token_expire_minutes")
    REFRESH_TOKEN_EXPIRE_DAYS = reset.get("refresh_token_expire_days")

    USER_ID_LEN = config_data.get("user_id_length")
    USER_ID_CHUNK_SIZE = config_data.get("user_id_chunk_size")
    postgres_connection_uri_spaces = db.get("postgres_uri_spaces")

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
# login(have to bring login functions)
def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

SECRET_KEY = "your_secret_key"



class Authentication:
    def __init__(self, logger):
        self.logger = logger

    def generate_refresh_token(self, user_data: dict) -> str:
        expiration_time = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        expiration_timestamp = int(expiration_time.timestamp())

        refresh_token = jwt.encode(
            {"user_data": user_data, "exp": expiration_timestamp},
            SECRET_KEY,
            algorithm="HS256",
        )
        return refresh_token

    def generate_access_token(self, user_data: dict) -> str:
        expiration_time = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        expiration_timestamp = int(expiration_time.timestamp())

        access_token = jwt.encode(
            {"user_data": user_data, "exp": expiration_timestamp},
            SECRET_KEY,
            algorithm="HS256",
        )
        return access_token

    async def authenticate_user(self, username, password, devicehash, session):
        user = session.query(User).filter_by(username=username).first()

        if user:
            stored_hash = user.password  # Assuming that user.password contains the stored hash
            # Use check_password_hash for 'sha256' hashing
            if check_password_hash(stored_hash,password):
                activeStatus = session.query(UserAttributes).filter_by(user_id=user.user_id).first()
                if activeStatus.active_status == "active":
                    refreshToken = session.query(RefreshToken).filter_by(user_id=user.user_id).first()
                    refreshToken.token = None
                    activeStatus.devicehash = None
                    activeStatus.active_status = "inactive"

                role = user.role
                user_data = {"username": username, "role": role, "devicehash": devicehash}

                # Update user_active to 'active' after successful login
                activeStatus.active_status = "active"

                # Generate access and refresh tokens
                access_token = self.generate_access_token(user_data)
                refresh_token = self.generate_refresh_token(user_data)
                
                user_id = user.user_id
                space_id = user.space_id
                refreshToken = session.query(RefreshToken).filter_by(user_id=user.user_id).first()
                refreshToken.token = refresh_token
                activeStatus.devicehash = devicehash
                session.commit()

                # Return tokens along with user data and status code 200 (OK)
                return {
                    "status": "success",
                    "message": "Authentication successful",
                    "username": username,
                    "userid": user_id,
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "devicehash": devicehash,
                    "role": role,
                }
            else:
                # Raise an HTTP exception with status code 401 (Unauthorized)
                raise HTTPException(status_code=401, detail="Invalid password")
        else:
            # Raise an HTTP exception with status code 401 (Unauthorized)
            raise HTTPException(status_code=401, detail="Invalid username")

    async def login(self, request_data: dict = Body(...), db: Session = Depends(get_db)):
        try:
            # Check if any additional fields are present in the request
            additional_fields = set(request_data.keys()) - {
            "username",
            "password",
            "devicehash",
            }
            if additional_fields:
               raise HTTPException(
                status_code=400,
                detail="Additional fields in the request are not allowed",
            )
            username = request_data.get("username")
            password = request_data.get("password")
            devicehash = request_data.get("devicehash")
            if not username or not password:
                raise HTTPException(
                    status_code=400, detail="Both 'username' and 'password' are required"
                )
            auth_result = await self.authenticate_user(username, password, devicehash, db)
            
            if auth_result["status"] == "success":
                logger.info("User authenticated successfully")
                return auth_result
                
            else:
                # Handle authentication errors here
                logger.error(f"An error occurred: {auth_result['message']}")
                raise HTTPException(status_code=401, detail=auth_result["message"])

        except HTTPException as http_exception:
            # Re-raise HTTP exceptions with appropriate status codes
            raise http_exception
        
    def verify_refresh_token(self,refresh_token: str) -> dict:
     try:
        # Decode and verify the refresh token
        refresh_data = jwt.decode(refresh_token, SECRET_KEY, algorithms=["HS256"])
        return refresh_data
     except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")   

    def refresh_access_token(self,data: dict = Body(...)):
     try:
        refresh_token = data["refresh_token"]

        # You need to implement verify_refresh_token function
        refresh_data = self.verify_refresh_token(refresh_token)

        username = refresh_data["user_data"]["username"]
        role = refresh_data["user_data"]["role"]
        devicehash = refresh_data["user_data"]["devicehash"]

        # Verify the refresh token, check if it's still valid, etc.
        user = session.query(User).filter_by(username=username, role=role).first()
        active = (
            session.query(UserAttributes)
            .filter_by(user_id=user.user_id, devicehash=devicehash)
            .first()
        )

        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not active:
            raise HTTPException(status_code=401, detail="User not found")

        # Generate a new access token
        user_data = {"username": username, "role": role, "devicehash": devicehash}
        new_access_token = self.generate_access_token(user_data)

        # Return the new access token
        return {"access_token": new_access_token, "token_type": "bearer"}
     except Exception as e:
        raise HTTPException(status_code=422, detail=str(e)) 
     
 

# create space function and the functions required for this function
    def generate_space_id(self):
    # Generate a 4-character string using lowercase letters
     space_id = "".join(random.choice(string.ascii_lowercase) for _ in range(4))

     return space_id 


    def create_space_db(self,space_name: str, db: Session):
     try:
        existing_space = (
            db.query(Spaces).filter(Spaces.space_name == space_name).first()
        )
        if existing_space:
            print(f"Space {space_name} already exists.")
            return existing_space.space_id, True  # Return both values in a tuple

        space_id = self.generate_space_id()

        new_space = Spaces(space_name=space_name, space_id=space_id)
        db.add(new_space)
        db.commit()
        engine = create_engine(
            postgres_connection_uri_spaces, isolation_level="AUTOCOMMIT"
        )

        with engine.connect() as connection:
            existing_databases = connection.execute(
                text("SELECT datname FROM pg_database")
            ).fetchall()
            if (space_id) in existing_databases:
                print(f"Database {space_name} already exists.")
                return space_id, False  # Return both values in a tuple

            create_db_query = text(
                "CREATE DATABASE {} TEMPLATE template0".format(space_id)
            )
            connection.execute(create_db_query)
            print(f'Database "{space_name}" created successfully.')

        return space_id, False  # Return both values in a tuple

     except Exception as e:
         print(f"Error: {e}")   
 
    def create_space(self,data: dict, db: Session = Depends(get_db)):
     try:
        # Check for required keys
        if "spacename" not in data or not data["spacename"]:
            raise HTTPException(status_code=400, detail="Key 'spacename' is required")

        # Check for additional keys
        allowed_keys = ["spacename"]  # Add other allowed keys if needed
        for key in data.keys():
            if key not in allowed_keys:
                raise HTTPException(
                    status_code=400, detail=f"Key '{key}' is not allowed"
                )

        space_name = data["spacename"]
        print(space_name)
        # Additional checks on space_name if needed

        # Create a new space in the main database and get the space_id
        space_id, already_exists =self.create_space_db(space_name, db)
        print(space_id)
        if already_exists:
            raise HTTPException(
                status_code=409, detail=f"Space '{space_name}' already exists"
            )
        return {"message": "Space created successfully", "space_id": space_id}

     except IntegrityError as e:
         db.rollback()
         raise HTTPException(
            status_code=401, detail=f"Space with name '{space_name}' already exists"
        ) from e

    
# register function and the functions required for this function
    def signup_user(self,data: dict, db: Session):
     try:
        user_details = data["details"]  # Extract details dictionary

        # Check if the username already exists
        existing_user = (
            db.query(User).filter_by(username=user_details["username"]).first()
        )

        if existing_user:
            username = user_details["username"]
            raise HTTPException(
                status_code=400, detail=f"Username {username} already taken"
            )

        # Check if the email already exists
        existing_email = db.query(User).filter_by(email=user_details["email"]).first()

        if existing_email:
            email = user_details["email"]
            raise HTTPException(
                status_code=400, detail=f"Account has been already created with {email}"
            )

        # Hash the password
        hashed_password = generate_password_hash(
            user_details["password"], method="pbkdf2:sha256"
        )

        flag = 0

        while flag == 0:
            user_id = generate_id(USER_ID_LEN, USER_ID_CHUNK_SIZE)
            execting_user_ids = session.query(User).filter_by(user_id=user_id).all()
            if not execting_user_ids:
                flag = 1

        # Create a new user with role as an array
        new_user = User(
            user_id=user_id,
            username=user_details["username"],
            password=hashed_password,
            email=user_details["email"],
            firstname=user_details["firstName"],
            lastname=user_details["lastName"],
            contact_number=user_details["contactNumber"],
            role=user_details["role"],
            space_id=user_details["spaceid"],
            hierarchy_ids=[],
        )

        db.add(new_user)

        # Create instances for associated tables
        new_user_attributes = UserAttributes(user_id=user_id)
        new_user_authentication = UserAuthentication(user_id=user_id)
        new_refresh_token = RefreshToken(user_id=user_id)

        # Add instances to the session
        db.add(new_user_attributes)
        db.add(new_user_authentication)
        db.add(new_refresh_token)
        db.commit()

        return {"message": "User registered successfully"}

     except HTTPException as e:
        db.rollback()
        raise e  # Re-raise the HTTPException with the appropriate status code and detail

     except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

 

    def api_register(self,details: dict, db: Session = Depends(get_db)):
     try:
         result = self.signup_user(details, db)
         return result

     except HTTPException as e:
         db.rollback()  # Rollback the session in case of an integrity error
         logger.warning("Username or email already registered")
         raise HTTPException(
             status_code=400, detail="Username or email already registered"
        )

     except Exception as e:
         db.rollback()  # Rollback the session in case of any other error
         logger.error(f"an error occured {str(e)}")

# reset password function and the functions belonging to this functions
    conf = ConnectionConfig(
    MAIL_USERNAME="sivatar7@gmail.com",
    MAIL_PASSWORD="fmac zeax xtez osmr",
    MAIL_FROM="sivatar7@gmail.com",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,  # Set to False for STARTTLS
)

    fastmail = FastMail(conf)     


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
    

    async def send_otp_email(self,email, otp):
     message = MessageSchema(
        subject="Password Reset OTP",
        recipients=[email],
        body=f"Your OTP for password reset is: {otp}",
        subtype="html",  # Specify the subtype as "html" or "plain" as needed
    )

     try:
        await self.fastmail.send_message(message)
        logger.info(f"Email sent successfully to {email}")
        return True  # Email sent successfully
     except Exception as e:
        logger.error(f"Error sending email to {email}: {e}")
        return False 


    def generate_otp(self):
     return str(randint(100000, 999999))

    async def reset_password(self , data: EmailInput):
     user =  session.query(User).filter_by(email=data.email).first()
     print(user)
     print(111111)
     if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

     authentication = (
        session.query(UserAuthentication).filter_by(user_id=user.user_id).first()
     )

     if authentication.otp_send_locked:
        current_time = datetime.now()
        if current_time < authentication.otp_send_locked_until:
            raise HTTPException(
                status_code=423,
                detail=f"Password reset locked until {authentication.otp_send_locked_until}",
            )
        else:
            authentication.otp_send_locked = False
            authentication.otp_send_count = 0  # Reset attempts
            authentication.otp_send_locked_until = None
            session.commit()

     # Increment password attempts
     if (
        authentication.otp_send_count < MAX_OTP_SEND_ATTEMPTS
        and not authentication.otp_send_locked
     ):
        # Generate an OTP
        otp = self.generate_otp()
        print(otp)

        # Store the current timestamp when the OTP is generated
        otp_generation_time = datetime.now()

        # Use your email sending logic here (replace the next line with your logic)
        result = await self.send_otp_email(user.email, otp)  # Await the coroutine

        if result:
            authentication.one_time_password = otp
            authentication.otp_send_last_timestamp = (
                otp_generation_time  # Store the OTP generation timestamp
            )
            authentication.otp_send_count += 1
            session.commit()
            return {"status": "success", "message": "OTP sent to your email"}
        else:
            print(22222)
            raise HTTPException(
                status_code=500, detail="Failed to send OTP. Please try again later"
            )
     else:
        authentication.otp_send_locked = True
        authentication.otp_send_locked_until = datetime.now() + timedelta(
            minutes=OTP_LOCK_DURATION_MINUTES
        )
        session.commit()
        raise HTTPException(
            status_code=423,
            detail=f"Password reset locked until {authentication.otp_send_locked_until}",
        )

# verify otp function and functions belonging to this function
    def is_otp_expired(self,otp_generation_time):
     current_time = datetime.now()
     time_elapsed = current_time - otp_generation_time
     validity_period = timedelta(minutes=3)  # Adjust the validity period as needed

     return time_elapsed > validity_period 


    def verify_otp(self,data: dict):
     user = session.query(User).filter_by(email=data["email"]).first()
     if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

     authentication = (
        session.query(UserAuthentication).filter_by(user_id=user.user_id).first()
     )

     if authentication.otp_attempt_locked:
        current_time = datetime.now()
        if current_time < authentication.otp_cool_down:
            raise HTTPException(
                status_code=423,
                detail=f"Password reset locked until {authentication.otp_cool_down}",
            )
        else:
            authentication.otp_attempt_locked = False
            authentication.otp_attempts_count = 0  # Reset attempts
            authentication.otp_cool_down = None
            session.commit()

     if authentication.otp_attempts_count >= MAX_OTP_ATTEMPTS:
        authentication.otp_attempt_locked = True
        authentication.otp_cool_down = datetime.now() + timedelta(
            minutes=OTP_ATTEMPTS_DURATION_MINUTES
         )
        session.commit()
        raise HTTPException(
            status_code=423,
            detail=f"Password reset locked until {authentication.otp_cool_down}",
         )
     else:
        authentication.otp_attempts_count += 1
        session.commit()

     if authentication.one_time_password == data["otp"]:
        if self.is_otp_expired(authentication.otp_send_last_timestamp):
            authentication.one_time_password = None
            authentication.otp_send_last_timestamp = None  # Clear the timestamp
            session.commit()
            raise HTTPException(status_code=400, detail="OTP has expired")

        # Here, you can add the logic to clear the temporary OTP or mark it as used if needed
        authentication.one_time_password = None
        authentication.otp_attempts_count = 0
        authentication.otp_send_count = 0
        authentication.otp_send_last_timestamp = None  # Clear the timestamp
        authentication.otp_cool_down = None
        authentication.otp_attempt_locked = False
        session.commit()
        logger.info("Otp verified successfully")
        return {"status": "success", "message": "OTP verified"}
     else:
        logger.error(f"an error occured {str} ")
        raise HTTPException(status_code=400, detail="Invalid OTP") 
     
# update password function
    def update_password(self,data: dict):
     user = session.query(User).filter_by(email=data["email"]).first()
     if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

     new_password = data["new_password"]
     user.password = generate_password_hash(new_password, method="sha256")

     session.commit()
     logger.info("Password updated successfully")
     return {"status": "success", "message": "Password updated successfully"}
  
#  Create hierarchy function and the functions belonging to this functions
    def space_exists_in_table(self,session, space_id):
    # Check if the space exists in the Spaces table
     space = session.query(Spaces).filter(Spaces.space_id == space_id).first()
     return space is not None
    
    def generate_hierarchy_id(self):
    # Generate a 4-character string using lowercase letters
     hierarchy_id = "".join(random.choice(string.ascii_lowercase) for _ in range(4))

     return hierarchy_id

    def check_and_add_data_to_table(self,hierarchy_id, session, space_id):
     try:
        # Check if the space exists in the Spaces table
        if not self.space_exists_in_table(session, space_id):
            print(f"Space '{space_id}' does not exist.")
            raise HTTPException(status_code=404, detail="space not found")

        # Create the PostgreSQL connection string
        postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
        postgres_connection_string = str(postgres_connection_uri)
        # Connect to the database directly without checking existence again
        engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
        metadata = MetaData(engine)
        inspector = inspect(engine)

        if hierarchy_id:
            # Fetch hierarchy_name based on hierarchy_id
            hierarchy_name = (
                session.query(Hierarchy)
                .filter(Hierarchy.hierarchy_id == hierarchy_id)
                .first()
            )

            if hierarchy_name:
                print(hierarchy_name.hierarchy_name)
                # Construct table name
                questions_table_name = f"{hierarchy_name.hierarchy_id}_questions"

                # Check if the table already exists
                if not inspector.has_table(questions_table_name):
                    # Create a new table for questions
                    questions_table = Table(
                        questions_table_name,
                        metadata,
                        Column("id", Integer, primary_key=True, autoincrement=True),
                        Column("question", String),
                        Column("selected_flag", Integer, default=None),
                    )

                    # Create the new table in the database
                    questions_table.create()

                    print(
                        f'Table "{questions_table}" created in database "{space_id}".'
                    )

                    # Create another table for transactions
                    transactions_table_name = (
                        f"{hierarchy_name.hierarchy_id}_transactions"
                    )
                    transaction_table = Table(
                        transactions_table_name,
                        metadata,
                        Column("id", Integer, primary_key=True, autoincrement=True),
                        Column("question_id", Integer, autoincrement=True),
                        Column("session_id", Integer),
                        Column("video_flag", Integer),
                        Column("prompt_flag", Integer),
                        Column("llm_flag", Integer),
                        Column("result", String(500)),
                        Column("user_id", String(4)),
                    )

                    # Create the transaction table in the database
                    transaction_table.create()

                    print(
                        f'Table "{transactions_table_name}" created in database "{space_id}".'
                    )

                else:
                    print(
                        f"Table '{transactions_table_name}' already exists. Skipping table creation."
                    )
            else:
                print(f"No hierarchy found for hierarchy ID: {hierarchy_id}")

     except Exception as e:
        print(f"Error: {e}")



    def create_hierarchy(self,data: dict, db: Session = Depends(get_db)):
     try:
        admin_id = data.get("adminId")
        space_id = data.get("spaceId")
        hierarchy_name = data.get("hierarchy_name")

        # Check if the space with the given space_id exists
        existing_space = db.query(Spaces).filter_by(space_id=space_id).first()
        if not existing_space:
            raise HTTPException(status_code=404, detail="Space not found")

        # Check if the hierarchy with the same name already exists
        existing_hierarchy = (
            db.query(Hierarchy).filter_by(hierarchy_name=hierarchy_name).first()
        )

        if existing_hierarchy:
            raise HTTPException(status_code=400, detail="Hierarchy already exists")

        hierarchy_id = self.generate_hierarchy_id()

        new_hierarchy = Hierarchy(
            hierarchy_name=hierarchy_name,
            space_id=space_id,
            hierarchy_id=hierarchy_id,
            admin_id=admin_id,
        )
        db.add(new_hierarchy)
        db.commit()

        self.check_and_add_data_to_table(hierarchy_id, db, space_id)
        return {"message": "Hierarchy created successfully"}

     except HTTPException as e:
         db.rollback()
         raise e 
     
# Valid tokens funtion and functions belong to this function
    async def validate_tokens(self,refreshToken, session):
     refresh_token = refreshToken

    # You need to implement verify_refresh_token function
     refresh_data = self.verify_refresh_token(refresh_token)

     username = refresh_data["user_data"]["username"]
     token_role = refresh_data["user_data"]["role"]

     user = session.query(User).filter_by(username=username).first()

     if user:
        activeStatus = (
            session.query(UserAttributes).filter_by(user_id=user.user_id).first()
        )
        if activeStatus.active_status == "active":
            role = user.role
            if role == token_role:
                # Return tokens along with user data and status code 200 (OK)
                return {
                    "status": "success",
                    "message": "Token Valid",
                    "username": username,
                    "role": role,
                }
        else:
            # Raise an HTTP exception with status code 401 (Unauthorized)
            raise HTTPException(status_code=401, detail="Invalid Token")
     else:
        # Raise an HTTP exception with status code 401 (Unauthorized)
        raise HTTPException(status_code=401, detail="Invalid Username")


    async def validateTokens(self,request_data: dict = Body(...), db: Session = Depends(get_db)):
     try:
        # Check if any additional fields are present in the request
        additional_fields = set(request_data.keys()) - {"refreshToken"}
        if additional_fields:
            raise HTTPException(
                status_code=400,
                detail="Additional fields in the request are not allowed",
            )

        refreshToken = request_data.get("refreshToken")

        if not refreshToken:
            raise HTTPException(status_code=400, detail="'refreshToken' are required")

        validate_result = await self.validate_tokens(refreshToken, db)

        if validate_result["status"] == "success":
            logger.info("Token Valid")
            return validate_result
        else:
            # Handle authentication errors here
            logger.error(f"An error occurred: {validate_result['message']}")
            raise HTTPException(status_code=401, detail=validate_result["message"])

     except HTTPException as http_exception:
        # Re-raise HTTP exceptions with appropriate status codes
        raise http_exception
     except Exception as e:
        # Handle other exceptions (e.g., database errors) here
        logger.error(f"An error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
     
#Logout function 
    async def logout(self,request_data: dict = Body(...), db: Session = Depends(get_db)):
     try:
        # Update the user_active column to 'inactive'
        user_id = request_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="UserID is required")

        activeStatus = db.query(UserAttributes).filter_by(user_id=user_id).first()
        activeStatus.active_status = "inactive"
        activeStatus.devicehash = None
        refresh_token = db.query(RefreshToken).filter_by(user_id=user_id).first()
        refresh_token.token = None

        db.commit()  # Commit the transaction

        return {"message": "User logged out successfully"}

     except Exception as e:
        # Handle exceptions, log errors, etc.
        raise HTTPException(status_code=500, detail="Internal Server Error")  