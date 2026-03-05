package ma.splittrack.expense.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.common.domain.Person;
import ma.splittrack.common.domain.SettlementMode;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "expenses")
@Getter
@Setter
@NoArgsConstructor
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Person payer;

    @Column(name = "amount_pln", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountPLN;

    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_mode", nullable = false)
    private SettlementMode settlementMode;

    @Column(name = "custom_owed_pln", precision = 12, scale = 2)
    private BigDecimal customOwedPLN;

    @Column(name = "original_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal originalAmount;

    @Column(name = "original_currency", nullable = false, length = 8)
    private String originalCurrency;

    @Column(name = "exchange_rate_to_pln", nullable = false, precision = 12, scale = 6)
    private BigDecimal exchangeRateToPLN;

    @Column(name = "receipt_url")
    private String receiptUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
