package ma.splittrack.expense.application;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import ma.splittrack.expense.domain.Expense;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class ExpenseExportService {
    private static final String[] HEADERS = new String[]{
        "Date", "Description", "Payer", "AmountPLN", "SettlementMode", "CustomOwedPLN",
        "OriginalAmount", "OriginalCurrency", "ExchangeRateToPLN", "ReceiptUrl"
    };

    public void writeCsv(List<Expense> expenses, HttpServletResponse response) throws IOException {
        response.setContentType("text/csv; charset=utf-8");
        response.setHeader("Content-Disposition", "attachment; filename=expenses.csv");

        StringBuilder sb = new StringBuilder();
        sb.append(String.join(";", HEADERS)).append("\n");
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;

        for (Expense expense : expenses) {
            sb.append(expense.getExpenseDate().format(formatter)).append(';');
            sb.append(escapeCsv(expense.getDescription())).append(';');
            sb.append(expense.getPayer().name()).append(';');
            sb.append(formatAmount(expense.getAmountPLN())).append(';');
            sb.append(expense.getSettlementMode().name()).append(';');
            sb.append(formatAmount(expense.getCustomOwedPLN())).append(';');
            sb.append(formatAmount(expense.getOriginalAmount())).append(';');
            sb.append(expense.getOriginalCurrency()).append(';');
            sb.append(formatAmount(expense.getExchangeRateToPLN())).append(';');
            sb.append(escapeCsv(expense.getReceiptUrl())).append('\n');
        }

        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        response.setContentLength(bytes.length);
        response.getOutputStream().write(bytes);
    }

    public void writeXlsx(List<Expense> expenses, HttpServletResponse response) throws IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=expenses.xlsx");

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Expenses");
            CellStyle headerStyle = createHeaderStyle(workbook);

            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;
            for (Expense expense : expenses) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(expense.getExpenseDate().format(formatter));
                row.createCell(1).setCellValue(expense.getDescription());
                row.createCell(2).setCellValue(expense.getPayer().name());
                row.createCell(3).setCellValue(formatAmount(expense.getAmountPLN()));
                row.createCell(4).setCellValue(expense.getSettlementMode().name());
                row.createCell(5).setCellValue(formatAmount(expense.getCustomOwedPLN()));
                row.createCell(6).setCellValue(formatAmount(expense.getOriginalAmount()));
                row.createCell(7).setCellValue(expense.getOriginalCurrency());
                row.createCell(8).setCellValue(formatAmount(expense.getExchangeRateToPLN()));
                row.createCell(9).setCellValue(expense.getReceiptUrl() != null ? expense.getReceiptUrl() : "");
            }

            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ServletOutputStream out = response.getOutputStream();
            workbook.write(out);
            out.flush();
        }
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        String escaped = value.replace("\"", "\"\"");
        return '"' + escaped + '"';
    }

    private String formatAmount(BigDecimal value) {
        if (value == null) {
            return "";
        }
        return value.stripTrailingZeros().toPlainString();
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        return style;
    }
}
