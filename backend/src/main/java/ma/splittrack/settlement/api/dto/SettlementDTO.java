package ma.splittrack.settlement.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.common.domain.Person;

@Getter
@Setter
@NoArgsConstructor
public class SettlementDTO {
    private Long id;
    private Person fromPerson;
    private Person toPerson;
    private BigDecimal amountPLN;
    private boolean isFull;
    private String note;
    private OffsetDateTime createdAt;

    @JsonProperty("isFull")
    public boolean isFull() {
        return isFull;
    }

    @JsonProperty("isFull")
    public void setFull(boolean full) {
        isFull = full;
    }
}
