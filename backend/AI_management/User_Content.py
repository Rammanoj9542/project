from fastapi import FastAPI, Request, Depends, HTTPException, Body
from sqlalchemy.orm import scoped_session, sessionmaker, Session, load_only, joinedload
import logging
from postgres import *

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
class UserContent:
    def __init__(self, logger):
        self.logger = logger
# upload questions function
    def upload_questions(self,data: dict, db: Session = Depends(get_db)):
     hierarchy_id = data.get("hierarchy_id")
     space_id = data.get("space_id")
     yaml_file_path = data.get("file_path")

     # Load questions from the YAML file
     try:
         with open(yaml_file_path, "r") as file:
            file_document = yaml.safe_load(file)
     except Exception as e:
         print(f"Error loading YAML file: {str(e)}")
         raise HTTPException(status_code=500, detail="Error loading questions from file")

     # Create the PostgreSQL connection string
     postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
     postgres_connection_string = str(postgres_connection_uri)

     # Connect to the database directly without checking existence again
     engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
     metadata = MetaData(engine)

    # Construct table name
     table_name = f"{hierarchy_id}_questions"  # Assuming hierarchy_id is unique

     with engine.connect() as connection:
        # Check if the table exists using the has_table method
        table_exists = connection.dialect.has_table(connection, table_name)

     print(f"Is table_exists = {table_exists}")
     if not table_exists:
         raise HTTPException(
            status_code=404,
            detail=f"The hierarchical table '{table_name}' does not exist in the database {space_id}",
         )

     # Check if the table already exists
     inspector = inspect(engine)
     if not inspector.has_table(table_name):
         print(f"The hierarchical table does not exist in the database {space_id}")
         return {
            "message": f"The hierarchical table '{table_name}' does not exist in the database {space_id}"
         }

     # Define the table structure
     hierarchical_table = Table(table_name, metadata, autoload=True)

     try:
         # Convert loaded YAML content into text
         questions = file_document.get("questions", [])  # Remove the colon

         with engine.connect() as connection:
             for index, line in enumerate(questions, start=1):
                 # Trim leading '-' and whitespace from each line
                 question_text = line.lstrip("- ").strip()

                 # Check if the question already exists for this space and hierarchy
                 query = select([hierarchical_table]).where(
                    and_(hierarchical_table.c.question == question_text)
                 )
                 result = connection.execute(query)
                 existing_row = result.fetchone()

                 if existing_row:
                    # If the question exists, do nothing or handle it as needed
                     print(
                        f"Question '{question_text}' already exists for space and hierarchy."
                     )
                    # You can choose to skip or delete the existing row here if necessary
                 else:
                     # Insert a new row for each unique question
                     engine.execute(
                        hierarchical_table.insert().values(question=question_text)
                     )

             return {"message": "Questions uploaded successfully"}
     except IntegrityError as e:
         return HTTPException(
             status_code=400,
             detail="Error uploading questions. Integrity constraint violated.",
         )
     
# get number of questions functions
    
    def get_hierarchy_cache_key(self,hierarchy_id):
     return f"latest_number_{hierarchy_id}"
    
    def update_latest_number_in_cache(self,cache, hierarchy_id, latest_number):
     cache_key = self.get_hierarchy_cache_key(self,hierarchy_id)
     cache[cache_key] = latest_number
     print("latest number", latest_number)


    def get_latest_number_from_cache(self,cache, hierarchy_id):
     cache_key = self.get_hierarchy_cache_key(self,hierarchy_id)
     return cache.get(cache_key) 

    def get_random_questions_from_hierarchy(self,num, space_id, hierarchy_id, session):
     connection = None
     selected_questions = []  # Initialize selected_questions here

     try:
         # Create the PostgreSQL connection string
         postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
         postgres_connection_string = str(postgres_connection_uri)

         # Connect to the database directly without checking existence again
         engine = create_engine(postgres_connection_string, isolation_level="AUTOCOMMIT")
         metadata = MetaData(engine)

         # Construct table name
         table = f"{hierarchy_id}_questions"

         # Check if the table exists
         with engine.connect() as connection:
             inspector = inspect(engine)
             if not inspector.has_table(table):
                 print(
                    f"The hierarchical table does not exist in the database {space_id}"
                )
                 raise HTTPException(
                    status_code=404,
                    detail=f"The table '{table}' does not exist in the database {space_id}",
                )

             hierarchical_table = Table(table, metadata, autoload=True)
             query = select([hierarchical_table]).where(
                hierarchical_table.c.selected_flag == 0
             )

             previous_questions = connection.execute(query).fetchall()
             if previous_questions:
                 cached_latest_data = self.get_latest_number_from_cache(cache, hierarchy_id)
                 latest_number = (
                    cached_latest_data if cached_latest_data is not None else 0
                 )

                 for q in previous_questions:
                     connection.execute(
                        hierarchical_table.update()
                        .where(hierarchical_table.c.id == q.id)
                        .values(selected_flag=latest_number + 1)
                    )

                 self. update_latest_number_in_cache(self,cache, hierarchy_id, latest_number + 1)

                 # Get all questions and filter out those already selected
                 query = select([hierarchical_table]).where(
                    hierarchical_table.c.selected_flag.is_(None)
                 )
                 remaining_questions = connection.execute(query).fetchall()

                 if len(remaining_questions) == 0:
                     # If no remaining questions, assign 0 to selected_questions
                     selected_questions = []
                 else:
                     # Select random questions
                     if len(remaining_questions) < num:
                        selected_questions = remaining_questions
                     else:
                         selected_questions = random.sample(remaining_questions, num)

                     # Update flags only if there are selected questions
                     for q in selected_questions:
                        connection.execute(
                            hierarchical_table.update()
                            .where(hierarchical_table.c.id == q.id)
                            .values(selected_flag=0)
                        )

                     session.commit()

                 return {"message": "Questions selected successfully"}
             else:
                 query1 = select([hierarchical_table]).where(
                     (hierarchical_table.c.selected_flag.is_(None))
                 )
                 all_questions = connection.execute(query1).fetchall()

                 if not all_questions:
                    raise HTTPException(
                        status_code=404,
                        detail="No questions left with None in selected_flag column",
                    )

                 if len(all_questions) < num:
                    selected_questions = all_questions
                 else:
                    selected_questions = random.sample(all_questions, num)

                 # Update flags only if there are selected questions
                 if selected_questions:
                    for q in selected_questions:
                        connection.execute(
                            hierarchical_table.update()
                            .where(hierarchical_table.c.id == q.id)
                            .values(selected_flag=0)
                        )

                    session.commit()

                 return {"message": "Questions selected successfully"}

     except exc.NoSuchTableError as e:
         print(f"Table {table} does not exist.")
     except Exception as e:
         print(f"An error occurred: {e}")
         raise HTTPException(
            status_code=500,
            detail="An error occurred while processing the request",
        )

     # If no questions were selected, return an empty list
     if not selected_questions:
        return {"message": "No questions available for selection"}

     raise HTTPException(
        status_code=404,
        detail="An error occurred during question selection",
    )



    def get_num_questions(self,data: dict = Body(...)):
     try:
        num = data.get("num_questions")
        space_id = data.get("space_id")
        hierarchy_id = data.get("hierarchy_id")

        global chosen_qs
        # Get random questions
        self.get_random_questions_from_hierarchy(num, space_id, hierarchy_id, session)

        # Log success
        logger.info("Retrieved questions successfully.")
        return {"num_questions": num}

     except HTTPException as http_exception:
        # Reraise HTTPExceptions so that they are not caught by the generic Exception handler
        raise http_exception

     except Exception as e:
        logger.error(f"An error occurred: {str(e)}")  # Log an error message
        raise HTTPException(status_code=500, detail="An error occurred")

#  available question count function
    def get_available_question_count(self,space_id, hierarchy_id, session):
     postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
     engine = create_engine(postgres_connection_uri, isolation_level="AUTOCOMMIT")
     metadata = MetaData(engine)

     # Construct table name
     table = f"{hierarchy_id}_questions"

     # Check if the table exists
     with engine.connect() as connection:
        inspector = inspect(engine)
        if not inspector.has_table(table):
            print(f"The hierarchical table does not exist in the database {space_id}")
            raise HTTPException(
                status_code=404,
                detail=f"The table '{table}' does not exist in the database {space_id}",
            )

        hierarchical_table = Table(table, metadata, autoload=True)

        # Build the query separately
        query = (
            session.query(func.count())
            .filter(hierarchical_table.c.selected_flag == None)
            .statement
        )

        # Execute the query using connection.execute
        result = connection.execute(query)

        # Fetch the result
        count = result.scalar()
        return count


    def available_question_count(self,data: dict):
     try:
        space_id = data.get("space_id")
        hierarchy_id = data.get("hierarchy_id")

        Session = sessionmaker(engine)
        session = Session()

        count = self.get_available_question_count(space_id, hierarchy_id, session)
        return {"available_question_count": count}
     except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
     finally:
        session.close()

# get choosen questions functions
    def retrieve_questions(self,data: dict, db: Session = Depends(get_db)):
     user_id = data.get("user_id")
     hierarchy_id = data.get("hierarchy_id")

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

     # find table name
     table_name = f"{hierarchy_id}_questions"

     with engine.connect() as connection:
        # Check if the table exists
        table_exists = connection.dialect.has_table(connection, table_name)

        if not table_exists:
            return {
                "message": f"The hierarchical table '{table_name}' does not exist in the database {space_id}"
            }

        # Define the table structure
        hierarchical_table = Table(table_name, metadata, autoload=True)

        query = select([hierarchical_table]).where(
            hierarchical_table.c.selected_flag == 0
        )

        questions_data = []
        result = connection.execute(query)
        for row in result:
            questions_data.append({"qid": row.id, "question": row.question})

     if not questions_data:
        return {"message": "No questions found for the provided IDs"}
     else:
        return {"chosen_questions": questions_data} 

# reset questions functions
    def reset_question_flags(self,space_id, hierarchy_id, session):
     postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
     engine = create_engine(postgres_connection_uri, isolation_level="AUTOCOMMIT")
     metadata = MetaData(engine)

     # Construct table name
     table = f"{hierarchy_id}_questions"

     # Check if the table exists
     with engine.connect() as connection:
        inspector = inspect(engine)
        if not inspector.has_table(table):
            print(f"The hierarchical table does not exist in the database {space_id}")
            raise HTTPException(
                status_code=404,
                detail=f"The table '{table}' does not exist in the database {space_id}",
            )

        hierarchical_table = Table(table, metadata, autoload=True)

        # Build the update query
        update_query = hierarchical_table.update().values(selected_flag=None)

        # Execute the update query
        connection.execute(update_query)

        # Commit the transaction
        session.commit()

        logger.info("Questions are reset successfully.")
        return {"message": "Question flags reset successfully."} 
     
    def clear_hierarchy_cache(self,hierarchy_id):
     # Remove the relevant key from the cache
     cache_key =self.get_hierarchy_cache_key(hierarchy_id)

     try:
        cache.pop(cache_key)
        print(f"Cache cleared for hierarchy_id: {hierarchy_id}")
     except KeyError:
        print(f"Key not found in cache for hierarchy_id: {hierarchy_id}")

 
     
    def reset_question_flags_endpoint(self,data: dict):
     session = None  # Initialize session outside the try block

     try:
        print(data)
        # Check if JSON content is present in the request
        space_id = data.get("space_id")
        hierarchy_id = data.get("hierarchy_id")

        # Create a Session
        postgres_connection_uri = f"{postgres_connection_uri_spaces}{space_id}"
        engine = create_engine(postgres_connection_uri, isolation_level="AUTOCOMMIT")
        Session = sessionmaker(bind=engine)
        session = Session()

        self.reset_question_flags(space_id, hierarchy_id, session)

        # Clear cache for the hierarchy
        self.clear_hierarchy_cache(hierarchy_id)

        return {"message": "Question flags reset successfully."}
     except HTTPException as http_exception:
        # Reraise HTTPExceptions so that they are not caught by the generic Exception handler
        raise http_exception
     except Exception as e:
        logger.error(f"An error occurred: {str(e)}")  # Log an error message
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
     finally:
        if session:
            session.close()

  
