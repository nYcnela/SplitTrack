package ma.splittrack.summary.domain;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Getter;
import ma.splittrack.common.domain.Person;

@Getter
@AllArgsConstructor
public class ImpliedTransfer {
    private final Person fromPerson;
    private final Person toPerson;
    private final BigDecimal amountPLN;
}
