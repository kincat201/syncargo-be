/* eslint-disable prettier/prettier */
type HBLColumnType = {
    columnName: string;
    defaultFieldName: string;
    defaultPlaceHolder: string;
    customFieldName: string;
    customPlaceHolder: string;
    fieldValue: {
        type: string;
        optionsValue: any[]
    },
    isActive: boolean;
}

export type HblFieldType = {
    carrierInformation: HBLColumnType[];
    voyageAndContainerDetails: HBLColumnType[];
    declarationOfTheShipper: HBLColumnType[];
    termsAndCondition: HBLColumnType[];
    others: HBLColumnType[];
}