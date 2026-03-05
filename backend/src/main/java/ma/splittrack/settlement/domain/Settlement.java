package ma.splittrack.settlement.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.common.domain.Person;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "settlements")
@Getter
@Setter
@NoArgsConstructor
public class Settlement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_person", nullable = false)
    private Person fromPerson;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_person", nullable = false)
    private Person toPerson;

    @Column(name = "amount_pln", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountPLN;

    @Column(name = "is_full", nullable = false)
    private boolean isFull;

    @Column
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
