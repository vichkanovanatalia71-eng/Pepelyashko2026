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
            ("Замовлення", ["Номер", "Дата", "ЄДРПОУ контрагента", "Ім'я контрагента", "Товари", "Загальна сума", "Drive File ID"]),
            ("Рахунки", ["Номер", "Дата", "ЄДРПОУ контрагента", "Ім'я контрагента", "Товари", "Загальна сума", "Drive File ID", "На основі замовлення"]),
            ("Акти", ["Номер", "Дата", "ЄДРПОУ контрагента", "Ім'я контрагента", "Роботи", "Загальна сума", "Drive File ID", "На основі замовлення", "На основі договору"]),
            ("Видаткові накладні", ["Номер", "Дата", "ЄДРПОУ контрагента", "Ім'я контрагента", "Товари", "Загальна сума", "Drive File ID", "На основі замовлення"]),
            ("Договори", ["Номер", "Дата", "ЄДРПОУ контрагента", "Ім'я контрагента", "Тип договору", "Предмет договору", "Сума договору", "Drive File ID", "На основі замовлення"]),
            ("Основні дані", ["ЄДРПОУ", "Назва", "Юридична адреса", "р/р(IBAN)", "Банк", "МФО", "email", "тел", "Посада", "В особі", "Підпис"])
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
    
    def create_invoice(self, data: Dict[str, Any], drive_file_id: str = '') -> Dict[str, Any]:
        """Create a new invoice."""
        return self._create_document("Рахунки", data, "рахунок", drive_file_id)
    
    def create_order(self, data: Dict[str, Any], drive_file_id: str = '') -> Dict[str, Any]:
        """Create a new order."""
        # Orders have special handling for order numbers
        try:
            worksheet = self.spreadsheet.worksheet("Замовлення")
            
            # Use provided order number or generate a simple sequential number
            order_number = data.get('order_number', '')
            if not order_number:
                # Fallback: generate simple sequential number if not provided
                records = worksheet.get_all_records()
                next_number = len(records) + 1
                order_number = f"{next_number:04d}"
            
            # Get counterparty from "Основні дані" by ЄДРПОУ
            counterparty = self.get_counterparty_from_main_data(data['counterparty_edrpou'])
            if not counterparty:
                raise ValueError(f"Контрагента з ЄДРПОУ {data['counterparty_edrpou']} не знайдено в 'Основні дані'")
            
            row = [
                order_number,  # Use the provided order number
                datetime.now().strftime('%Y-%m-%d'),
                data['counterparty_edrpou'],
                counterparty['Назва'],
                json.dumps(data['items'], ensure_ascii=False),
                data['total_amount'],
                drive_file_id  # Add drive_file_id to the row
            ]
            
            worksheet.append_row(row)
            logger.info(f"Created замовлення #{order_number}")
            
            return {
                'success': True,
                'message': 'Замовлення успішно створено',
                'document_number': order_number,
                'data': data
            }
        except Exception as e:
            logger.error(f"Error creating замовлення: {str(e)}")
            raise
    
    
    def update_order_drive_id(self, order_number: str, drive_file_id: str) -> bool:
        """Update drive_file_id for existing order."""
        try:
            worksheet = self.spreadsheet.worksheet("Замовлення")
            records = worksheet.get_all_records()
            
            # Find the row with this order number
            for idx, record in enumerate(records, start=2):  # Start at 2 (header is row 1)
                if str(record.get('Номер', '')).strip() == str(order_number).strip():
                    # Find the column index for drive_file_id
                    headers = worksheet.row_values(1)
                    if 'drive_file_id' in headers:
                        col_idx = headers.index('drive_file_id') + 1
                        worksheet.update_cell(idx, col_idx, drive_file_id)
                        return True
            return False
        except Exception as e:
            print(f"Error updating order drive_file_id: {str(e)}")
            return False
    def create_act(self, data: Dict[str, Any], drive_file_id: str = '') -> Dict[str, Any]:
        """Create a new act of completed work."""
        return self._create_document("Акти", data, "акт", drive_file_id)
    
    def create_waybill(self, data: Dict[str, Any], drive_file_id: str = '') -> Dict[str, Any]:
        """Create a new waybill."""
        return self._create_document("Видаткові накладні", data, "видаткову накладну", drive_file_id)
    
    def create_contract(self, data: Dict[str, Any], drive_file_id: str = '') -> Dict[str, Any]:
        """Create a new contract."""
        try:
            worksheet = self.spreadsheet.worksheet("Договори")
            
            # Get counterparty from "Основні дані"
            counterparty = self.get_counterparty_from_main_data(data['counterparty_edrpou'])
            if not counterparty:
                raise ValueError(f"Контрагента з ЄДРПОУ {data['counterparty_edrpou']} не знайдено в 'Основні дані'")
            
            # Use provided contract number or generate a simple sequential number
            contract_number = data.get('contract_number', '')
            if not contract_number:
                # Fallback: generate simple sequential number if not provided
                records = worksheet.get_all_records()
                next_number = len(records) + 1
                contract_number = f"{next_number:04d}"
            
            row = [
                contract_number,
                datetime.now().strftime('%Y-%m-%d'),
                data['counterparty_edrpou'],
                counterparty['Назва'],
                data.get('contract_type', ''),
                data.get('subject', ''),
                data.get('amount', 0),
                drive_file_id,  # Add drive_file_id to the row
                data.get('based_on_order', '')  # Add based_on_order (номер замовлення)
            ]
            
            worksheet.append_row(row)
            logger.info(f"Created договір #{contract_number}")
            
            return {
                'success': True,
                'message': 'Договір успішно створено',
                'document_number': contract_number,
                'data': data
            }
        except Exception as e:
            logger.error(f"Error creating договір: {str(e)}")
            raise
    
    def _create_document(self, sheet_name: str, data: Dict[str, Any], doc_type: str, drive_file_id: str = '') -> Dict[str, Any]:
        """Generic method to create documents (invoices, acts, waybills)."""
        try:
            worksheet = self.spreadsheet.worksheet(sheet_name)
            
            # Get next document number
            records = worksheet.get_all_records()
            next_number = len(records) + 1
            
            # Get counterparty from "Основні дані" by ЄДРПОУ
            counterparty = self.get_counterparty_from_main_data(data['counterparty_edrpou'])
            if not counterparty:
                raise ValueError(f"Контрагента з ЄДРПОУ {data['counterparty_edrpou']} не знайдено в 'Основні дані'")
            
            row = [
                f"{next_number:04d}",
                datetime.now().strftime('%Y-%m-%d'),
                data['counterparty_edrpou'],
                counterparty['Назва'],
                json.dumps(data['items'], ensure_ascii=False),
                data['total_amount'],
                drive_file_id,  # Add drive_file_id to the row
                data.get('based_on_order', '')  # Add based_on_order (номер замовлення)
            ]
            
            # Add based_on_contract for acts (if sheet is "Акти")
            if sheet_name == "Акти":
                row.append(data.get('based_on_contract', ''))  # Add based_on_contract (номер договору)
            
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
                        # Skip header rows
                        try:
                            amount = float(record['Сума договору']) if record['Сума договору'] else 0.0
                        except (ValueError, TypeError):
                            continue
                            
                        contract = {
                            'number': str(record['Номер']),
                            'date': str(record['Дата']),
                            'counterparty_edrpou': str(record['ЄДРПОУ контрагента']),
                            'counterparty_name': str(record["Ім'я контрагента"]),
                            'contract_type': str(record.get('Тип договору', '')),
                            'subject': str(record['Предмет договору']),
                            'amount': amount
                        }
                        
                        # Add drive_file_id if available
                        if 'Drive File ID' in record:
                            contract['drive_file_id'] = str(record.get('Drive File ID', ''))
                        
                        # Add based_on_order if available
                        if 'На основі замовлення' in record:
                            contract['based_on_order'] = str(record.get('На основі замовлення', ''))
                        
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
    
    def get_documents(self, sheet_name: str) -> List[Dict[str, Any]]:
        """Get all documents from a specific sheet."""
        try:
            worksheet = self.spreadsheet.worksheet(sheet_name)
            records = worksheet.get_all_records()
            
            result = []
            for record in records:
                # Skip header rows or empty rows
                try:
                    total_amount = float(record.get('Загальна сума', 0))
                except (ValueError, TypeError):
                    # Skip rows where total_amount is not a valid number (like headers)
                    continue
                    
                doc = {
                    'number': str(record['Номер']),
                    'date': str(record['Дата']),
                    'counterparty_edrpou': str(record['ЄДРПОУ контрагента']),
                    'counterparty_name': str(record["Ім'я контрагента"]),
                    'total_amount': total_amount
                }
                
                # Add drive_file_id if available (for Рахунки, Акти, Видаткові накладні)
                if 'Drive File ID' in record:
                    doc['drive_file_id'] = str(record.get('Drive File ID', ''))
                
                # Add based_on_order if available (номер замовлення)
                if 'На основі замовлення' in record:
                    doc['based_on_order'] = str(record.get('На основі замовлення', ''))
                
                # Parse items from JSON
                items_key = 'Товари' if sheet_name != 'Акти' else 'Роботи'
                try:
                    items_value = record.get(items_key, '[]')
                    if items_value and items_value != items_key:  # Skip if it's the header
                        doc['items'] = json.loads(items_value)
                    else:
                        doc['items'] = []
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
            
            # Define expected headers to handle duplicate empty headers
            expected_headers = ['ЄДРПОУ', 'Назва', 'Юридична адреса', 'р/р(IBAN)', 'Банк', 'МФО', 'email', 'тел', 'Посада', 'В особі', 'Підпис']
            
            try:
                records = worksheet.get_all_records(expected_headers=expected_headers)
            except Exception as header_error:
                logger.warning(f"Failed to get records with expected headers: {str(header_error)}")
                # Fallback: get raw values and process manually
                all_values = worksheet.get_all_values()
                if not all_values:
                    return None
                
                # Use first row as headers, filter out empty ones
                headers = [h.strip() for h in all_values[0] if h.strip()]
                records = []
                
                for row in all_values[1:]:
                    if any(cell.strip() for cell in row):  # Skip empty rows
                        record = {}
                        for i, header in enumerate(expected_headers):
                            if i < len(row):
                                record[header] = row[i].strip()
                            else:
                                record[header] = ''
                        records.append(record)
            
            # Search for counterparty by ЄДРПОУ (column A)
            for record in records:
                record_edrpou = str(record.get('ЄДРПОУ', '')).strip()
                # Skip header row
                if record_edrpou == edrpou.strip() and record_edrpou != 'ЄДРПОУ':
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
                        'Посада': str(record.get('Посада', 'Директор')),
                        'В особі': str(record.get('В особі', '')),
                        'Підпис': str(record.get('Підпис', '')),
                        'Директор': str(record.get('В особі', ''))  # Use "В особі" as director name
                    }
                    logger.info(f"Found counterparty in 'Основні дані': {counterparty['Назва']}")
                    return counterparty
            
            logger.warning(f"Counterparty with ЄДРПОУ {edrpou} not found in 'Основні дані'")
            return None
            
        except Exception as e:
            logger.error(f"Error getting counterparty from main data: {str(e)}")
    
    def update_counterparty_in_main_data(self, edrpou: str, updated_data: Dict[str, str]) -> bool:
        """Update counterparty data in 'Основні дані' sheet by ЄДРПОУ."""
        try:
            worksheet = self.spreadsheet.worksheet("Основні дані")
            
            # Get all values (raw data)
            all_values = worksheet.get_all_values()
            if not all_values or len(all_values) < 2:
                logger.error("No data in 'Основні дані' sheet")
                return False
            
            # Find the row with matching ЄДРПОУ
            headers = all_values[0]
            edrpou_col = 0  # ЄДРПОУ is in column A (index 0)
            
            for row_index, row in enumerate(all_values[1:], start=2):  # Start from row 2 (skip header)
                if row[edrpou_col].strip() == edrpou.strip():
                    # Found the row, update it
                    # Map field names to column indices
                    field_map = {
                        'Назва': 1,
                        'Юридична адреса': 2,
                        'р/р(IBAN)': 3,
                        'Банк': 4,
                        'МФО': 5,
                        'email': 6,
                        'тел': 7,
                        'Посада': 8,
                        'В особі': 9,
                        'Підпис': 10
                    }
                    
                    # Update each field
                    for field_name, col_index in field_map.items():
                        if field_name in updated_data:
                            # Update cell (row_index is 1-based, col_index needs to be 1-based too)
                            cell_address = f"{chr(65 + col_index)}{row_index}"
                            worksheet.update(cell_address, updated_data[field_name])
                    
                    logger.info(f"Updated counterparty with ЄДРПОУ {edrpou} in 'Основні дані'")
                    return True
            
            logger.warning(f"Counterparty with ЄДРПОУ {edrpou} not found for update")
            return False
            
        except Exception as e:
            logger.error(f"Error updating counterparty in main data: {str(e)}")
            return False

            return None
    
    def get_buyer_main_data(self) -> Dict[str, str]:
        """Get buyer's main data from 'Основні дані' sheet (first record or default)."""
        try:
            worksheet = self.spreadsheet.worksheet("Основні дані")
            
            # Define expected headers to handle duplicate empty headers
            expected_headers = ['ЄДРПОУ', 'Назва', 'Юридична адреса', 'р/р(IBAN)', 'Банк', 'МФО', 'email', 'тел', 'Посада', 'В особі', 'Підпис']
            
            try:
                records = worksheet.get_all_records(expected_headers=expected_headers)
            except Exception as header_error:
                logger.warning(f"Failed to get records with expected headers: {str(header_error)}")
                # Fallback: get raw values and process manually
                all_values = worksheet.get_all_values()
                if not all_values or len(all_values) < 2:
                    records = []
                else:
                    records = []
                    for row in all_values[1:]:  # Skip header row
                        if any(cell.strip() for cell in row):  # Skip empty rows
                            record = {}
                            for i, header in enumerate(expected_headers):
                                if i < len(row):
                                    record[header] = row[i].strip()
                                else:
                                    record[header] = ''
                            records.append(record)
            
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
                    'Посада': str(record.get('Посада', 'Директор')),
                    'В особі': str(record.get('В особі', '')),
                    'Підпис': str(record.get('Підпис', '')),
                    'Директор': str(record.get('В особі', ''))
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
                'Директор': 'Ольга ГРИЦКЕВИЧ',
                'Посада': 'Директор',
                'В особі': 'Ольга ГРИЦКЕВИЧ',
                'Підпис': ''
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
                'Директор': 'Ольга ГРИЦКЕВИЧ',
                'Посада': 'Директор',
                'В особі': 'Ольга ГРИЦКЕВИЧ',
                'Підпис': ''
            }

    def get_supplier_data(self) -> Dict[str, str]:
        """Get supplier data from 'Мої дані' sheet."""
        try:
            worksheet = self.spreadsheet.worksheet("Мої дані")
            records = worksheet.get_all_records()
            
            if not records:
                raise ValueError("Немає даних у аркуші 'Мої дані'")
            
            # Беремо перший рядок з даними (рядок 2, після заголовків)
            supplier = records[0]
            
            # Return with both Ukrainian and English keys for compatibility
            return {
                # Ukrainian keys (primary)
                'ЄДРПОУ': str(supplier.get('ЄДРПОУ', '')),
                'Назва': str(supplier.get('Назва', '')),
                'Юридична адреса': str(supplier.get('Юридична адреса', '')),
                'р/р(IBAN)': str(supplier.get('р/р(IBAN)', '')),
                'Банк': str(supplier.get('Банк', '')),
                'МФО': str(supplier.get('МФО', '')),
                'email': str(supplier.get('email', '')),
                'тел': str(supplier.get('тел', '')),
                'Посада': str(supplier.get('Посада', '')),
                'В особі': str(supplier.get('В особі', '')),
                'Підпис': str(supplier.get('Підпис', '')),
                # English keys (for backward compatibility)
                'edrpou': str(supplier.get('ЄДРПОУ', '')),
                'name': str(supplier.get('Назва', '')),
                'legal_address': str(supplier.get('Юридична адреса', '')),
                'iban': str(supplier.get('р/р(IBAN)', '')),
                'bank': str(supplier.get('Банк', '')),
                'mfo': str(supplier.get('МФО', '')),
                'phone': str(supplier.get('тел', '')),
                'position': str(supplier.get('Посада', '')),
                'represented_by': str(supplier.get('В особі', '')),
                'signature': str(supplier.get('Підпис', ''))
            }
        except Exception as e:
            logger.error(f"Error getting supplier data: {str(e)}")
            # Повертаємо дані за замовчуванням з обома форматами ключів
            return {
                'ЄДРПОУ': '14307529',
                'Назва': "АКЦІОНЕРНЕ ТОВАРИСТВО 'АНТОНОВ'",
                'Юридична адреса': '',
                'р/р(IBAN)': 'UA383052990000026001006812960',
                'Банк': "в АТ КБ 'ПриватБанк'",
                'МФО': '305299',
                'email': 'kievtds@gmail.com',
                'тел': '504505588',
                'Посада': 'Заступник директора з цифрового розвитку та інфраструктури (з соціального забезпечення)',
                'В особі': 'в особі директора Чорного Станіслава Івановича, що діє на підставі Статуту',
                'Підпис': 'Дмитро ТИТАРЕНКО',
                'edrpou': '14307529',
                'name': "АКЦІОНЕРНЕ ТОВАРИСТВО 'АНТОНОВ'",
                'legal_address': '',
                'iban': 'UA383052990000026001006812960',
                'bank': "в АТ КБ 'ПриватБанк'",
                'mfo': '305299',
                'phone': '504505588',
                'position': 'Заступник директора з цифрового розвитку та інфраструктури (з соціального забезпечення)',
                'represented_by': 'в особі директора Чорного Станіслава Івановича, що діє на підставі Статуту',
                'signature': 'Дмитро ТИТАРЕНКО'
            }


