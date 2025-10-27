import gspread
from google.oauth2.service_account import Credentials
from typing import List, Dict, Any, Optional
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class GoogleSheetsService:
    def __init__(self, credentials_path: str, spreadsheet_id: str):
        self.spreadsheet_id = spreadsheet_id
        self.credentials_path = credentials_path
        self.client = self._authenticate()
        self.spreadsheet = self.client.open_by_key(spreadsheet_id)
        self._initialize_sheets()
    
    def _authenticate(self):
        """Authenticate with Google Sheets API using service account."""
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
        credentials = Credentials.from_service_account_file(
            self.credentials_path,
            scopes=scopes
        )
        return gspread.authorize(credentials)
    
    def _initialize_sheets(self):
        """Initialize required sheets if they don't exist."""
        required_sheets = [
            ("Контрагенти", ["ЄДРПОУ", "Ім'я представника", "Email", "Телефон", "IBAN", "Тип договору", "Посада керівника", "ПІБ керівника", "Дата створення"]),
            ("Замовлення", ["Номер", "Дата", "ЄДРПОУ контрагента", "Ім'я контрагента", "Товари", "Загальна сума"]),
            ("Рахунки", ["Номер", "Дата", "ЄДРПОУ контрагента", "Ім'я контрагента", "Товари", "Загальна сума"]),
            ("Акти", ["Номер", "Дата", "ЄДРПОУ контрагента", "Ім'я контрагента", "Роботи", "Загальна сума"]),
            ("Видаткові накладні", ["Номер", "Дата", "ЄДРПОУ контрагента", "Ім'я контрагента", "Товари", "Загальна сума"]),
            ("Договори", ["Номер", "Дата", "ЄДРПОУ контрагента", "Ім'я контрагента", "Тип договору", "Предмет договору", "Сума договору"]),
            ("Основні дані", ["ЄДРПОУ", "Назва", "Юридична адреса", "р/р(IBAN)", "Банк", "МФО", "email", "тел", "Директор"])
        ]
        
        existing_sheets = [sheet.title for sheet in self.spreadsheet.worksheets()]
        
        for sheet_name, headers in required_sheets:
            if sheet_name not in existing_sheets:
                logger.info(f"Creating sheet: {sheet_name}")
                worksheet = self.spreadsheet.add_worksheet(title=sheet_name, rows=1000, cols=20)
                worksheet.append_row(headers)
            else:
                worksheet = self.spreadsheet.worksheet(sheet_name)
                # Check if headers exist
                first_row = worksheet.row_values(1)
                if not first_row or first_row != headers:
                    worksheet.insert_row(headers, index=1)
    
    def create_counterparty(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new counterparty."""
        try:
            worksheet = self.spreadsheet.worksheet("Контрагенти")
            
            # Check if counterparty with same ЄДРПОУ already exists
            existing = self.get_counterparty_by_edrpou(data['edrpou'])
            if existing:
                raise ValueError(f"Контрагент з ЄДРПОУ {data['edrpou']} вже існує")
            
            row = [
                data['edrpou'],
                data['representative_name'],
                data['email'],
                data['phone'],
                data['iban'],
                data['contract_type'],
                data.get('director_position', ''),
                data.get('director_name', ''),
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ]
            
            worksheet.append_row(row)
            logger.info(f"Created counterparty with ЄДРПОУ: {data['edrpou']}")
            
            return {
                'success': True,
                'message': 'Контрагента успішно створено',
                'data': data
            }
        except Exception as e:
            logger.error(f"Error creating counterparty: {str(e)}")
            raise
    
    def get_counterparty_by_edrpou(self, edrpou: str) -> Optional[Dict[str, Any]]:
        """Find counterparty by ЄДРПОУ code."""
        try:
            worksheet = self.spreadsheet.worksheet("Контрагенти")
            records = worksheet.get_all_records()
            
            for record in records:
                if str(record.get('ЄДРПОУ', '')) == str(edrpou):
                    return {
                        'edrpou': str(record['ЄДРПОУ']),
                        'representative_name': str(record["Ім'я представника"]),
                        'email': str(record['Email']),
                        'phone': str(record['Телефон']),
                        'iban': str(record['IBAN']),
                        'contract_type': str(record['Тип договору']),
                        'director_position': str(record.get('Посада керівника', '')),
                        'director_name': str(record.get('ПІБ керівника', ''))
                    }
            return None
        except Exception as e:
            logger.error(f"Error getting counterparty: {str(e)}")
            return None
    
    def get_all_counterparties(self) -> List[Dict[str, Any]]:
        """Get all counterparties."""
        try:
            worksheet = self.spreadsheet.worksheet("Контрагенти")
            records = worksheet.get_all_records()
            
            return [{
                'edrpou': str(record['ЄДРПОУ']),
                'representative_name': str(record["Ім'я представника"]),
                'email': str(record['Email']),
                'phone': str(record['Телефон']),
                'iban': str(record['IBAN']),
                'contract_type': str(record['Тип договору']),
                'director_position': str(record.get('Посада керівника', '')),
                'director_name': str(record.get('ПІБ керівника', ''))
            } for record in records]
        except Exception as e:
            logger.error(f"Error getting all counterparties: {str(e)}")
            return []
    
    def create_invoice(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new invoice."""
        return self._create_document("Рахунки", data, "рахунок")
    
    def create_order(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new order."""
        return self._create_document("Замовлення", data, "замовлення")
    
    def create_act(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new act of completed work."""
        return self._create_document("Акти", data, "акт")
    
    def create_waybill(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new waybill."""
        return self._create_document("Видаткові накладні", data, "видаткову накладну")
    
    def create_contract(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new contract."""
        try:
            worksheet = self.spreadsheet.worksheet("Договори")
            
            # Get next document number
            records = worksheet.get_all_records()
            next_number = len(records) + 1
            
            # Verify counterparty exists
            counterparty = self.get_counterparty_by_edrpou(data['counterparty_edrpou'])
            if not counterparty:
                raise ValueError(f"Контрагента з ЄДРПОУ {data['counterparty_edrpou']} не знайдено")
            
            row = [
                f"{next_number:04d}",
                datetime.now().strftime('%Y-%m-%d'),
                data['counterparty_edrpou'],
                counterparty['representative_name'],
                data.get('contract_type', counterparty['contract_type']),
                data.get('subject', ''),
                data.get('amount', 0)
            ]
            
            worksheet.append_row(row)
            logger.info(f"Created договір #{next_number:04d}")
            
            return {
                'success': True,
                'message': 'Договір успішно створено',
                'document_number': f"{next_number:04d}",
                'data': data
            }
        except Exception as e:
            logger.error(f"Error creating договір: {str(e)}")
            raise
    
    def _create_document(self, sheet_name: str, data: Dict[str, Any], doc_type: str) -> Dict[str, Any]:
        """Generic method to create documents (invoices, acts, waybills)."""
        try:
            worksheet = self.spreadsheet.worksheet(sheet_name)
            
            # Get next document number
            records = worksheet.get_all_records()
            next_number = len(records) + 1
            
            # Verify counterparty exists
            counterparty = self.get_counterparty_by_edrpou(data['counterparty_edrpou'])
            if not counterparty:
                raise ValueError(f"Контрагента з ЄДРПОУ {data['counterparty_edrpou']} не знайдено")
            
            row = [
                f"{next_number:04d}",
                datetime.now().strftime('%Y-%m-%d'),
                data['counterparty_edrpou'],
                counterparty['representative_name'],
                json.dumps(data['items'], ensure_ascii=False),
                data['total_amount']
            ]
            
            worksheet.append_row(row)
            logger.info(f"Created {doc_type} #{next_number:04d}")
            
            return {
                'success': True,
                'message': f'{doc_type.capitalize()} успішно створено',
                'document_number': f"{next_number:04d}",
                'data': data
            }
        except Exception as e:
            logger.error(f"Error creating {doc_type}: {str(e)}")
            raise
    
    def get_counterparty_documents(self, edrpou: str) -> Dict[str, List[Dict[str, Any]]]:
        """Get all documents for a specific counterparty."""
        try:
            documents = {
                'orders': [],
                'invoices': [],
                'acts': [],
                'waybills': [],
                'contracts': []
            }
            
            # Get orders
            try:
                orders = self.get_documents("Замовлення")
                documents['orders'] = [doc for doc in orders if str(doc.get('counterparty_edrpou')) == str(edrpou)]
            except:
                pass
            
            # Get invoices
            try:
                invoices = self.get_documents("Рахунки")
                documents['invoices'] = [doc for doc in invoices if str(doc.get('counterparty_edrpou')) == str(edrpou)]
            except:
                pass
            
            # Get acts
            try:
                acts = self.get_documents("Акти")
                documents['acts'] = [doc for doc in acts if str(doc.get('counterparty_edrpou')) == str(edrpou)]
            except:
                pass
            
            # Get waybills
            try:
                waybills = self.get_documents("Видаткові накладні")
                documents['waybills'] = [doc for doc in waybills if str(doc.get('counterparty_edrpou')) == str(edrpou)]
            except:
                pass
            
            # Get contracts
            try:
                worksheet = self.spreadsheet.worksheet("Договори")
                records = worksheet.get_all_records()
                
                for record in records:
                    if str(record.get('ЄДРПОУ контрагента')) == str(edrpou):
                        contract = {
                            'number': str(record['Номер']),
                            'date': str(record['Дата']),
                            'counterparty_edrpou': str(record['ЄДРПОУ контрагента']),
                            'counterparty_name': str(record["Ім'я контрагента"]),
                            'contract_type': str(record['Тип договору']),
                            'subject': str(record['Предмет договору']),
                            'amount': float(record['Сума договору']) if record['Сума договору'] else 0.0
                        }
                        documents['contracts'].append(contract)
            except:
                pass
            
            return documents
        except Exception as e:
            logger.error(f"Error getting documents for counterparty: {str(e)}")
            return {
                'orders': [],
                'invoices': [],
                'acts': [],
                'waybills': [],
                'contracts': []
            }
        """Get all documents from a specific sheet."""
        try:
            worksheet = self.spreadsheet.worksheet(sheet_name)
            records = worksheet.get_all_records()
            
            result = []
            for record in records:
                doc = {
                    'number': str(record['Номер']),
                    'date': str(record['Дата']),
                    'counterparty_edrpou': str(record['ЄДРПОУ контрагента']),
                    'counterparty_name': str(record["Ім'я контрагента"]),
                    'total_amount': float(record['Загальна сума']) if record['Загальна сума'] else 0.0
                }
                
                # Parse items from JSON
                items_key = 'Товари' if sheet_name != 'Акти' else 'Роботи'
                try:
                    doc['items'] = json.loads(record[items_key])
                except:
                    doc['items'] = []
                
                result.append(doc)
            
            return result
        except Exception as e:
            logger.error(f"Error getting documents from {sheet_name}: {str(e)}")
            return []
    
    def get_counterparty_from_main_data(self, edrpou: str) -> Optional[Dict[str, str]]:
        """Get counterparty data from 'Основні дані' sheet by ЄДРПОУ."""
        try:
            worksheet = self.spreadsheet.worksheet("Основні дані")
            records = worksheet.get_all_records()
            
            # Search for counterparty by ЄДРПОУ (column A)
            for record in records:
                record_edrpou = str(record.get('ЄДРПОУ', '')).strip()
                if record_edrpou == edrpou.strip():
                    # Convert to dict with all fields
                    counterparty = {
                        'ЄДРПОУ': record_edrpou,
                        'Назва': str(record.get('Назва', '')),
                        'Юридична адреса': str(record.get('Юридична адреса', '')),
                        'р/р(IBAN)': str(record.get('р/р(IBAN)', '')),
                        'Банк': str(record.get('Банк', '')),
                        'МФО': str(record.get('МФО', '')),
                        'email': str(record.get('email', '')),
                        'тел': str(record.get('тел', '')),
                        'Директор': str(record.get('Директор', ''))
                    }
                    logger.info(f"Found counterparty in 'Основні дані': {counterparty['Назва']}")
                    return counterparty
            
            logger.warning(f"Counterparty with ЄДРПОУ {edrpou} not found in 'Основні дані'")
            return None
            
        except Exception as e:
            logger.error(f"Error getting counterparty from main data: {str(e)}")
            return None
    
    def get_buyer_main_data(self) -> Dict[str, str]:
        """Get buyer's main data from 'Основні дані' sheet (first record or default)."""
        try:
            worksheet = self.spreadsheet.worksheet("Основні дані")
            records = worksheet.get_all_records()
            
            # Get first record as default buyer
            if records and len(records) > 0:
                record = records[0]
                data = {
                    'ЄДРПОУ': str(record.get('ЄДРПОУ', '')),
                    'Назва': str(record.get('Назва', '')),
                    'Юридична адреса': str(record.get('Юридична адреса', '')),
                    'р/р(IBAN)': str(record.get('р/р(IBAN)', '')),
                    'Банк': str(record.get('Банк', '')),
                    'МФО': str(record.get('МФО', '')),
                    'email': str(record.get('email', '')),
                    'тел': str(record.get('тел', '')),
                    'Директор': str(record.get('Директор', ''))
                }
                logger.info(f"Retrieved buyer main data from first record: {data['Назва']}")
                return data
            
            # Return default values if no records
            return {
                'Назва': 'КОМУНАЛЬНЕ НЕКОМЕРЦІЙНЕ ПІДПРИЄМСТВО "БАГАТОПРОФІЛЬНИЙ ШПИТАЛЬ ВЕТЕРАНІВ"',
                'Юридична адреса': 'Україна, 65038, Одеська обл., місто Одеса, Фонтанська дорога, будинок 114',
                'ЄДРПОУ': '01998555',
                'р/р(IBAN)': 'UA863052990000026006004901414',
                'Банк': 'в акціонерному товаристві комерційного банку "Приватбанк"',
                'МФО': '305299',
                'email': 'ooggiov@ukr.net',
                'тел': '+380689705567',
                'Директор': 'Ольга ГРИЦКЕВИЧ'
            }
            
        except Exception as e:
            logger.error(f"Error getting buyer main data: {str(e)}")
            return {
                'Назва': 'КОМУНАЛЬНЕ НЕКОМЕРЦІЙНЕ ПІДПРИЄМСТВО "БАГАТОПРОФІЛЬНИЙ ШПИТАЛЬ ВЕТЕРАНІВ"',
                'Юридична адреса': 'Україна, 65038, Одеська обл., місто Одеса, Фонтанська дорога, будинок 114',
                'ЄДРПОУ': '01998555',
                'р/р(IBAN)': 'UA863052990000026006004901414',
                'Банк': 'в акціонерному товаристві комерційного банку "Приватбанк"',
                'МФО': '305299',
                'email': 'ooggiov@ukr.net',
                'тел': '+380689705567',
                'Директор': 'Ольга ГРИЦКЕВИЧ'
            }


