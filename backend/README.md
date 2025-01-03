# Stands Admin App

## Overview
The Stands Admin App is a modular backend system designed to manage real estate projects, reservations, applications, and payments efficiently.

## Features
- User management with role-based access control (Admin, Manager, Realtor, Customer).
- Modular route handling for streamlined API management.
- Property management with geolocation and project associations.
- Reservation, application, and payment workflows.
- Admin and manager dashboards with analytics.
- Comprehensive API documentation with Swagger.
- Fully testable with modular unit and integration tests.

## Installation
1. **Clone the Repository**:
    ```bash
    git clone <repository_url>
    cd stands_admin_app
    ```

2. **Set Up a Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3. **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4. **Set Up Environment Variables**:
    Create a `.env` file in the root directory with the following variables:
    ```env
    SECRET_KEY=your_secret_key
    DATABASE_URL=sqlite:///data.db
    JWT_SECRET_KEY=your_jwt_secret_key
    ```

5. **Initialize the Database**:
    ```bash
    flask db init
    flask db migrate -m "Initial migration"
    flask db upgrade
    ```

6. **Seed the Database** (Optional):
    ```bash
    flask seed_db
    ```

7. **Run the Application**:
    ```bash
    flask run
    ```

## API Documentation
API documentation is available at `/api/docs` when the application is running.

## Testing
Run the tests using:
```bash
pytest tests/
```

## Directory Structure
```
stands_admin_app/
├── app.py
├── config.py
├── extensions.py
├── commands.py
├── models.py
├── schemas/
│   ├── user_schema.py
│   ├── property_schema.py
├── routes/
│   ├── admin_routes.py
│   ├── manager_routes.py
│   ├── realtor_routes.py
│   ├── customer_routes.py
│   ├── payment_routes.py
├── utils.py
├── tests/
│   ├── test_models.py
│   ├── test_routes.py
│   ├── conftest.py
├── migrations/
├── static/
├── uploads/
├── logging_config.py
├── requirements.txt
├── README.md
```

## License
This project is licensed under the MIT License. See the LICENSE file for details.
