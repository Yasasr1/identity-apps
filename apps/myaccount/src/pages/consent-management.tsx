/**
 * Copyright (c) 2019, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PageLayout } from "@wso2is/react-components";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Dispatch } from "redux";
import { Divider, Grid } from "semantic-ui-react";
import { Consents } from "../components";
import { AlertInterface } from "../models";
import { addAlert } from "../store/actions";

/**
 * Consents Management page.
 *
 * @returns Consent management page.
 */
const ConsentManagementPage = (): ReactElement => {

    const { t } = useTranslation();
    const dispatch: Dispatch<any> = useDispatch();

    /**
     * Dispatches the alert object to the redux store.
     * @param alert - Alert object.
     */
    const handleAlerts = (alert: AlertInterface): void => {
        dispatch(addAlert(alert));
    };

    return (
        <PageLayout
            pageTitle="Consent Management"
            title={ t("myAccount:pages.consentManagement.title") }
            description={ t("myAccount:pages.consentManagement.subTitle") }
        >
            <Divider hidden />
            <Grid>
                <Grid.Row>
                    <Grid.Column width={ 16 }>
                        <Consents onAlertFired={ handleAlerts }/>
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        </PageLayout>
    );
};

/**
 * A default export was added to support React.lazy.
 * TODO: Change this to a named export once react starts supporting named exports for code splitting.
 * @see {@link https://reactjs.org/docs/code-splitting.html#reactlazy}
 */
export default ConsentManagementPage;
