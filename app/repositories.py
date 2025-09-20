from typing import Type, TypeVar, Generic, List, Optional, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .database import Record
import uuid

T = TypeVar('T', bound=BaseModel)


class Repository(Generic[T]):
    def __init__(self, session: Session, store: str, model: Type[T]):
        self.session = session
        self.store = store
        self.model = model

    def _key(self, obj: T) -> Any:
        if hasattr(obj, 'id'):
            return getattr(obj, 'id')
        if hasattr(obj, 'username'):
            return getattr(obj, 'username')
        raise AttributeError('Object must have id or username')

    def add(self, obj: T) -> None:
        key = str(self._key(obj))
        row = Record(store=self.store, key=key, data=obj.model_dump(mode="json"))
        self.session.merge(row)
        self.session.commit()

    def get(self, key: Any) -> Optional[T]:
        row = self.session.get(Record, (self.store, str(key)))
        if not row:
            return None
        return self.model(**row.data)

    def list(self) -> List[T]:
        rows = self.session.query(Record).filter_by(store=self.store).all()
        return [self.model(**r.data) for r in rows]

    def delete(self, key: Any) -> None:
        self.session.query(Record).filter_by(store=self.store, key=str(key)).delete()
        self.session.commit()

    def exists(self, key: Any) -> bool:
        return self.get(key) is not None


class ListRepository:
    def __init__(self, session: Session, store: str):
        self.session = session
        self.store = store

    def append(self, item: Any) -> None:
        key = str(uuid.uuid4())
        row = Record(store=self.store, key=key, data=item)
        self.session.add(row)
        self.session.commit()

    def list(self) -> List[Any]:
        rows = self.session.query(Record).filter_by(store=self.store).all()
        return [r.data for r in rows]

    def clear(self) -> None:
        self.session.query(Record).filter_by(store=self.store).delete()
        self.session.commit()


class SimpleRepository:
    """Repository for mapping key -> primitive or list"""

    def __init__(self, session: Session, store: str):
        self.session = session
        self.store = store

    def get(self, key: Any, default=None):
        row = self.session.get(Record, (self.store, str(key)))
        if not row:
            return default
        return row.data

    def set(self, key: Any, value: Any) -> None:
        row = Record(store=self.store, key=str(key), data=value)
        self.session.merge(row)
        self.session.commit()

    def clear(self) -> None:
        self.session.query(Record).filter_by(store=self.store).delete()
        self.session.commit()
from .models import (
    AgentInDB,
    Project,
    Stand,
    MandateRecord,
    Offer,
    PropertyApplication,
    AccountOpening,
    LoanApplication,
    Agreement,
    Loan,
    DocumentRequirement,
    ImportedDepositAccount,
    ImportedLoanAccount,
)


class Repositories:
    def __init__(self, session: Session):
        self.agents = Repository(session, 'agents', AgentInDB)
        self.projects = Repository(session, 'projects', Project)
        self.stands = Repository(session, 'stands', Stand)
        self.mandates = Repository(session, 'mandates', MandateRecord)
        self.mandate_history = SimpleRepository(session, 'mandate_history')
        self.offers = Repository(session, 'offers', Offer)
        self.applications = Repository(session, 'applications', PropertyApplication)
        self.account_openings = Repository(session, 'account_openings', AccountOpening)
        self.loan_applications = Repository(session, 'loan_applications', LoanApplication)
        self.loans = Repository(session, 'loans', Loan)
        self.notifications = ListRepository(session, 'notifications')
        self.agreements = Repository(session, 'agreements', Agreement)
        self.customer_loan_accounts = SimpleRepository(session, 'customer_loan_accounts')
        self.audit_log = ListRepository(session, 'audit_log')
        self.counters = SimpleRepository(session, 'counters')
        self.document_requirements = Repository(
            session, 'document_requirements', DocumentRequirement
        )
        self.imported_deposit_accounts = Repository(
            session, 'imported_deposit_accounts', ImportedDepositAccount
        )
        self.imported_loan_accounts = Repository(
            session, 'imported_loan_accounts', ImportedLoanAccount
        )
