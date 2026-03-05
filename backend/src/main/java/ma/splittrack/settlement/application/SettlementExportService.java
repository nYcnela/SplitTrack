package ma.splittrack.settlement.application;

import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import ma.splittrack.settlement.domain.Settlement;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class SettlementExportService {
    private static final String[] HEADERS = new String[]{
        "CreatedAt", "FromPerson", "ToPerson", "AmountPLN", "IsFull", "Note"
    };

    public void writeCsv(List<Settlement> settlements, HttpServletResponse response) throws IOException {
        response.setContentType("text/csv; charset=utf-8");
        response.setHeader("Content-Disposition", "attachment; filename=settlements.csv");

        StringBuilder sb = new StringBuilder();
        sb.append(String.join(";", HEADERS)).append("\n");

        for (Settlement settlement : settlements) {
            sb.append(settlement.getCreatedAt().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)).append(';');
            sb.append(settlement.getFromPerson().name()).append(';');
            sb.append(settlement.getToPerson().name()).append(';');
            sb.append(formatAmount(settlement.getAmountPLN())).append(';');
            sb.append(settlement.isFull()).append(';');
            sb.append(escapeCsv(settlement.getNote())).append('\n');
        }

        byte[] bytes = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        response.setContentLength(bytes.length);
        response.getOutputStream().write(bytes);
    }

    public void writeXlsx(List<Settlement> settlements, HttpServletResponse response) throws IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=settlements.xlsx");

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Settlements");
            CellStyle headerStyle = createHeaderStyle(workbook);

            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Settlement settlement : settlements) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(settlement.getCreatedAt().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
                row.createCell(1).setCellValue(settlement.getFromPerson().name());
                row.createCell(2).setCellValue(settlement.getToPerson().name());
                row.createCell(3).setCellValue(formatAmount(settlement.getAmountPLN()));
                row.createCell(4).setCellValue(settlement.isFull());
                row.createCell(5).setCellValue(settlement.getNote() != null ? settlement.getNote() : "");
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
