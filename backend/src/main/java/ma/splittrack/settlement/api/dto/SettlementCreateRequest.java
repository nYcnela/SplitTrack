package ma.splittrack.settlement.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.common.domain.Person;

@Getter
@Setter
@NoArgsConstructor
public class SettlementCreateRequest {
    @NotNull
    @Schema(example = "EMILKA")
    private Person fromPerson;

    @NotNull
    @Schema(example = "MACIEK")
    private Person toPerson;

    @NotNull
    @Positive
    @Schema(example = "321.00")
    private BigDecimal amountPLN;

    @JsonProperty("isFull")
    @JsonAlias("full")
    @Schema(example = "true")
    private boolean isFull;

    @Schema(example = "Przelew")
    private String note;

    @JsonProperty("isFull")
    public boolean isFull() {
        return isFull;
    }

    @JsonProperty("isFull")
    public void setFull(boolean full) {
        isFull = full;
    }
}
