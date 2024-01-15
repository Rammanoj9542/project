from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    SmallInteger,
    Boolean,
    DateTime,
    Float,
)
from sqlalchemy.dialects.postgresql import ARRAY as Array
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.schema import PrimaryKeyConstraint
import json
from sqlalchemy.dialects.postgresql import JSONB


Base = declarative_base()


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    user_id = Column(String(50), ForeignKey("users.user_id"), primary_key=True)
    token = Column(String(255))
    user = relationship("User", back_populates="refresh_tokens")


class User(Base):
    __tablename__ = "users"
    user_id = Column(String(50), primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(50), unique=True, nullable=False)
    firstname = Column(String(50))
    lastname = Column(String(50))
    contact_number = Column(String(20))
    password = Column(String(128))
    role = Column(String(50))
    space_id = Column(String(4))
    hierarchy_ids = Column(Array(String), nullable=True)

    transactions = relationship("Transaction", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    user_attributes = relationship("UserAttributes", back_populates="user")
    user_authentication = relationship("UserAuthentication", back_populates="user")

    def init(self, username, password, email, role, **kwargs):
        self.username = username
        self.password = password
        self.email = email
        self.role = role


class Question(Base):
    __tablename__ = "questions"

    qid = Column(Integer, primary_key=True, autoincrement=True)
    question = Column(String(200))
    # question_type = Column(String(100))
    selected_flag = Column(SmallInteger, default=None, nullable=True)
    transactions = relationship("Transaction", back_populates="question")

    hierarchy_id = Column(
        Integer, ForeignKey("hierarchy.hierarchy_id"), nullable=False
    )  # Add ForeignKey
    # Define a relationship with the Hierarchy model
    hierarchy = relationship("Hierarchy", back_populates="questions")

    def __init__(self, **kwargs):
        super(Question, self).__init__(**kwargs)
        self.question = kwargs.get("question")
        self.selected_flag = kwargs.get("selected_flag")


class Transaction(Base):
    __tablename__ = "transactions"
    username = Column(String(50), ForeignKey("users.username"), nullable=False)
    session_id = Column(Integer, nullable=False)
    question_id = Column(Integer, ForeignKey("questions.qid"), nullable=False)
    videoflag = Column(SmallInteger, nullable=True)
    promptflag = Column(SmallInteger, nullable=True)
    llmflag = Column(SmallInteger, nullable=True)
    result = result = Column(Float, nullable=True)
    user = relationship("User", back_populates="transactions")
    question = relationship("Question", back_populates="transactions")
    __table_args__ = (PrimaryKeyConstraint("username", "session_id", "question_id"),)


class UserAttributes(Base):
    __tablename__ = "user_attributes"

    user_id = Column(String(50), ForeignKey("users.user_id"), primary_key=True)
    devicehash = Column(String(100), default=None)
    active_status = Column(String(10), default="inactive")

    user = relationship("User", back_populates="user_attributes")


class UserAuthentication(Base):
    __tablename__ = "user_authentication"

    user_id = Column(String(50), ForeignKey("users.user_id"), primary_key=True)
    contact_number_verification = Column(Boolean, nullable=True, default=False)
    # Store OTP
    one_time_password = Column(String(6))  # Change the length as needed

    # Check OTP attempts
    otp_attempts_count = Column(
        Integer, default=0
    )  # To store OTP verification attempts

    # Set cool down period for 1 hour if OTP attempts exceed 3 times
    otp_attempt_locked = Column(Boolean, default=False)
    otp_cool_down = Column(DateTime)  # To store the end of the cool down period

    # Set a limit for sending only 5 OTPs, with a 5-minute waiting period if exceeded
    otp_send_count = Column(Integer, default=0)  # To store the number of OTPs sent
    otp_send_last_timestamp = Column(
        DateTime
    )  # To store the timestamp of the last OTP sent

    # To lock/unlock the account
    otp_send_locked = Column(Boolean, default=False)
    otp_send_locked_until = Column(DateTime)  # To store the lock expiration time

    user = relationship("User", back_populates="user_authentication")


# Add this relationship to the Spaces class as well to complete the bidirectional relationship
class Spaces(Base):
    __tablename__ = "spaces"
    space_id = Column(String, primary_key=True)
    space_name = Column(String)
    # Define a relationship with the Hierarchy model
    hierarchies = relationship("Hierarchy", back_populates="space")


class Hierarchy(Base):
    __tablename__ = "hierarchy"

    hierarchy_id = Column(String, primary_key=True)
    hierarchy_name = Column(String, nullable=True)
    space_id = Column(String, ForeignKey("spaces.space_id"))
    admin_id = Column(String(50))

    # Define a relationship with the Spaces model
    space = relationship("Spaces", back_populates="hierarchies")

    # Define a relationship with the User model
    # Define a relationship with the Question model
    questions = relationship("Question", back_populates="hierarchy")
