import { LEGAL_INFO } from "./config";

function whoWeAreParenthetical(locale: "en" | "bn"): string {
  return LEGAL_INFO.registeredBusinessName
    ? locale === "bn"
      ? ` (নিবন্ধিত ব্যবসার নাম: ${LEGAL_INFO.registeredBusinessName})`
      : ` (registered business name: ${LEGAL_INFO.registeredBusinessName})`
    : "";
}

export function PrivacyEn({ showAdminBanner }: { showAdminBanner: boolean }) {
  const whoWeAre = whoWeAreParenthetical("en");
  return (
    <>
      {showAdminBanner && (
        <p className="rounded-control bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Template — not legal advice.</strong> This document was drafted to match Pick Up&apos;s actual data
          practices, so it&apos;s ready for a lawyer to review, not so it can be treated as final. Have a qualified
          lawyer licensed in Bangladesh review and finalize this policy — including any Bangladesh data-protection
          obligations — before Pick Up launches to real customers. (Only visible to admins.)
        </p>
      )}
      {LEGAL_INFO.lastUpdated && (
        <p className="text-xs text-gray-500">Last updated: {LEGAL_INFO.lastUpdated} · Applies to all users of the Pick Up platform.</p>
      )}

      <h2 className="font-heading text-brand-dark">1. Who this policy covers</h2>
      <p>
        This Privacy Policy explains how Pick Up{whoWeAre} (contact{" "}
        <a href="mailto:information@pickupn.com">information@pickupn.com</a>, <a href="tel:+8801310790678">+8801310790678</a>,
        Khagrachari Sadar, Khagrachari, Chattogram, Bangladesh) collects, uses, and protects personal data from
        Customers, Vendors, Riders, and Advertisers who use the Pick Up platform.
      </p>

      <h2 className="font-heading text-brand-dark">2. Information we collect</h2>
      <p>What we collect depends on how you use Pick Up:</p>
      <ul>
        <li><strong>Everyone with an account:</strong> name, phone number, email address (if provided), and account password (stored hashed, never in plain text).</li>
        <li><strong>Customers:</strong> delivery addresses, location (only if you choose to share it), order history, saved coupons, reviews and ratings you submit, and support messages.</li>
        <li><strong>Vendors:</strong> shop/restaurant details (name, address, description, opening hours), trade licence and owner identification documents submitted during onboarding, bank/payout details, product and menu listings, and order and earnings history.</li>
        <li><strong>Riders:</strong> National ID (NID) details and photo, vehicle information, licence documents submitted during onboarding, delivery history, and earnings/payout history.</li>
        <li><strong>Advertisers:</strong> business contact details, ad creative (including any photos you upload for an ad), targeting preferences, and campaign performance data.</li>
      </ul>
      <p>
        We only ever collect your precise device location if you explicitly grant permission; you can always enter
        your delivery address manually instead.
      </p>

      <h2 className="font-heading text-brand-dark">3. Why we use this information</h2>
      <ul>
        <li>to create and secure your account, and let you log in;</li>
        <li>to process orders: match you with the right Vendor and Rider, calculate prices and delivery fees, and show accurate delivery times;</li>
        <li>to review and approve Vendor, Rider, and Advertiser applications, including verifying the identity and business documents submitted;</li>
        <li>to calculate and pay Vendor earnings and Rider earnings, including the commission rate applicable to each order or delivery;</li>
        <li>to provide customer support and respond to refund, cancellation, or complaint requests;</li>
        <li>to enforce age restrictions on age-restricted products;</li>
        <li>to detect and prevent fraud, abuse, or violations of our Terms of Service;</li>
        <li>to operate advertising placements on the Platform and measure their performance for the Advertiser.</li>
      </ul>

      <h2 className="font-heading text-brand-dark">4. Who sees your information</h2>
      <p>
        We share only what is necessary for each party to do their part in fulfilling your order:
      </p>
      <ul>
        <li>Vendors see the Customer&apos;s name, delivery address, phone number, and order contents needed to prepare and hand off an order.</li>
        <li>Riders see the Customer&apos;s name, delivery address, phone number, and order contents needed to complete a delivery, and share their own live location with the Customer during an active delivery.</li>
        <li>Customers see a Vendor&apos;s public shop details (name, address, logo, menu) and a Rider&apos;s name, but not a Rider&apos;s NID, licence documents, or other private onboarding information.</li>
        <li>Pick Up administrators can see account, order, and onboarding-document details as needed to operate the Platform, approve applications, resolve disputes, and process refunds and payouts. Vendor and Rider verification documents (NID, trade licence, and similar) are kept private and accessible only to Pick Up admin staff — never shown publicly or to other Vendors, Riders, or Customers.</li>
      </ul>
      <p>We do not sell your personal data to third parties.</p>

      <h2 className="font-heading text-brand-dark">5. Where your data is stored</h2>
      <p>
        Pick Up&apos;s database and file storage (including uploaded documents and photos) are hosted with Supabase,
        with data located in India. The Pick Up application itself is hosted with Hostinger. Digital payments are
        processed by our third-party payment providers under their own privacy terms; Pick Up does not store your
        full payment card or mobile-wallet credentials.
      </p>

      <h2 className="font-heading text-brand-dark">6. How long we keep your data</h2>
      <p>
        We keep account and order data for as long as your account is active and for a reasonable period afterward
        to meet our legal, tax, and accounting obligations and to resolve any disputes. Vendor and Rider onboarding
        documents (NID, trade licence) are kept for as long as the Vendor or Rider account is active, plus any
        retention period required by applicable law. If you ask us to delete your account, we delete or anonymize
        personal data that we are not legally required to keep.
      </p>

      <h2 className="font-heading text-brand-dark">7. Your choices</h2>
      <p>
        You can view and update your account details, manage your saved addresses, and view your order history at
        any time from your account. You can contact support to request a copy of your personal data, ask us to
        correct inaccurate information, or request deletion of your account; we will action deletion requests
        except where we are legally required to keep certain records (for example, order and payment records for
        accounting and tax purposes).
      </p>

      <h2 className="font-heading text-brand-dark">8. Cookies</h2>
      <p>
        We use cookies only for essential site functions, not for advertising or tracking: keeping you logged in,
        remembering your in-progress checkout (delivery address and schedule selection), an applied coupon code,
        and your language and location preferences. We do not use third-party advertising or analytics cookies.
      </p>

      <h2 className="font-heading text-brand-dark">9. Age-restricted products</h2>
      <p>
        Where age-restricted products (such as cigarettes and smoking accessories) are enabled, we record your
        checkout-time confirmation that you meet the minimum age, and the outcome of any age check our rider
        performs at delivery, without unnecessarily storing full copies of identity documents from Customers.
      </p>

      <h2 className="font-heading text-brand-dark">10. Security</h2>
      <p>
        We use industry-standard measures to protect your data, including encrypted connections (HTTPS) between
        your device and our servers, hashed password storage, and access controls that restrict who can view
        sensitive information such as verification documents and payment details to the staff who need it to do
        their job. No method of storage or transmission is completely secure, and we cannot guarantee absolute
        security.
      </p>

      <h2 className="font-heading text-brand-dark">11. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time to reflect changes to the Platform or applicable law.
        We will post the updated policy with a new &quot;last updated&quot; date, and material changes will be
        highlighted on the Platform.
      </p>

      <h2 className="font-heading text-brand-dark">12. Contact us</h2>
      <p>
        Questions about this policy, or requests to access, correct, or delete your data, can be sent through our{" "}
        <a href="/contact">contact page</a>, by email to <a href="mailto:information@pickupn.com">information@pickupn.com</a>,
        or by phone at <a href="tel:+8801310790678">+8801310790678</a>.
      </p>
    </>
  );
}

export function PrivacyBn({ showAdminBanner }: { showAdminBanner: boolean }) {
  const whoWeAre = whoWeAreParenthetical("bn");
  return (
    <>
      {showAdminBanner && (
        <p className="rounded-control bg-amber-50 p-3 text-xs text-amber-900">
          <strong>টেমপ্লেট — এটি আইনি পরামর্শ নয়।</strong> Pick Up-এর প্রকৃত ডেটা-ব্যবহার পদ্ধতির সাথে মিলিয়ে এই নথিটি
          তৈরি করা হয়েছে, যাতে একজন আইনজীবী এটি পর্যালোচনা করতে পারেন — এটিকে চূড়ান্ত হিসেবে গণ্য করা উচিত নয়। Pick
          Up সাধারণ গ্রাহকদের জন্য চালু করার আগে বাংলাদেশে লাইসেন্সপ্রাপ্ত একজন যোগ্য আইনজীবীকে দিয়ে এই নীতি
          পর্যালোচনা ও চূড়ান্ত করান — বাংলাদেশের ডেটা-সুরক্ষা সংক্রান্ত যেকোনো বাধ্যবাধকতাসহ। (শুধুমাত্র অ্যাডমিনদের জন্য দৃশ্যমান।)
        </p>
      )}
      {LEGAL_INFO.lastUpdated && (
        <p className="text-xs text-gray-500">সর্বশেষ হালনাগাদ: {LEGAL_INFO.lastUpdated} · Pick Up প্ল্যাটফর্মের সকল ব্যবহারকারীর জন্য প্রযোজ্য।</p>
      )}

      <h2 className="font-heading text-brand-dark">১. এই নীতি কাদের জন্য প্রযোজ্য</h2>
      <p>
        এই গোপনীয়তা নীতি ব্যাখ্যা করে যে Pick Up{whoWeAre} (যোগাযোগ{" "}
        <a href="mailto:information@pickupn.com">information@pickupn.com</a>, <a href="tel:+8801310790678">+8801310790678</a>,
        ঠিকানা: খাগড়াছড়ি সদর, খাগড়াছড়ি, চট্টগ্রাম, বাংলাদেশ) কীভাবে Pick Up প্ল্যাটফর্ম ব্যবহারকারী গ্রাহক, ভেন্ডর,
        রাইডার ও বিজ্ঞাপনদাতাদের ব্যক্তিগত তথ্য সংগ্রহ, ব্যবহার ও সুরক্ষা করে।
      </p>

      <h2 className="font-heading text-brand-dark">২. আমরা যে তথ্য সংগ্রহ করি</h2>
      <p>আপনি Pick Up কীভাবে ব্যবহার করেন তার উপর নির্ভর করে আমরা যা সংগ্রহ করি:</p>
      <ul>
        <li><strong>অ্যাকাউন্টধারী সবাই:</strong> নাম, ফোন নম্বর, ইমেইল ঠিকানা (দিলে), এবং অ্যাকাউন্ট পাসওয়ার্ড (হ্যাশ করা অবস্থায় সংরক্ষিত, কখনো প্লেইন টেক্সটে নয়)।</li>
        <li><strong>গ্রাহক:</strong> ডেলিভারি ঠিকানা, লোকেশন (শুধু আপনি শেয়ার করতে চাইলে), অর্ডার ইতিহাস, সংরক্ষিত কুপন, আপনার দেওয়া রিভিউ ও রেটিং, এবং সাপোর্ট বার্তা।</li>
        <li><strong>ভেন্ডর:</strong> দোকান/রেস্টুরেন্টের বিবরণ (নাম, ঠিকানা, বর্ণনা, খোলার সময়), অনবোর্ডিংয়ের সময় জমা দেওয়া ট্রেড লাইসেন্স ও মালিকের পরিচয়পত্র, ব্যাংক/পেআউট তথ্য, পণ্য ও মেনু তালিকা, এবং অর্ডার ও আয়ের ইতিহাস।</li>
        <li><strong>রাইডার:</strong> জাতীয় পরিচয়পত্র (NID) তথ্য ও ছবি, যানবাহনের তথ্য, অনবোর্ডিংয়ের সময় জমা দেওয়া লাইসেন্স নথি, ডেলিভারি ইতিহাস, এবং আয়/পেআউট ইতিহাস।</li>
        <li><strong>বিজ্ঞাপনদাতা:</strong> ব্যবসার যোগাযোগের তথ্য, বিজ্ঞাপনের উপকরণ (আপলোড করা যেকোনো ছবিসহ), টার্গেটিং পছন্দ, এবং ক্যাম্পেইন পারফরম্যান্স ডেটা।</li>
      </ul>
      <p>
        আপনার ডিভাইসের সুনির্দিষ্ট লোকেশন আমরা তখনই সংগ্রহ করি যখন আপনি স্পষ্টভাবে অনুমতি দেন; আপনি সবসময় ঠিকানা
        নিজে লিখেও দিতে পারেন।
      </p>

      <h2 className="font-heading text-brand-dark">৩. কেন আমরা এই তথ্য ব্যবহার করি</h2>
      <ul>
        <li>আপনার অ্যাকাউন্ট তৈরি ও সুরক্ষিত রাখতে এবং লগ ইন করতে সাহায্য করতে;</li>
        <li>অর্ডার প্রক্রিয়া করতে: সঠিক ভেন্ডর ও রাইডারের সাথে মেলানো, মূল্য ও ডেলিভারি ফি হিসাব করা, সঠিক ডেলিভারি সময় দেখানো;</li>
        <li>ভেন্ডর, রাইডার ও বিজ্ঞাপনদাতার আবেদন পর্যালোচনা ও অনুমোদন করতে, জমা দেওয়া পরিচয় ও ব্যবসায়িক নথি যাচাইসহ;</li>
        <li>প্রতিটি অর্ডার বা ডেলিভারিতে প্রযোজ্য কমিশন হারসহ ভেন্ডর ও রাইডারের আয় হিসাব ও পরিশোধ করতে;</li>
        <li>গ্রাহক সহায়তা প্রদান করতে এবং রিফান্ড, বাতিলকরণ বা অভিযোগের অনুরোধের জবাব দিতে;</li>
        <li>বয়স-নিষিদ্ধ পণ্যে বয়সের বিধিনিষেধ প্রয়োগ করতে;</li>
        <li>প্রতারণা, অপব্যবহার বা আমাদের সেবার শর্তাবলী লঙ্ঘন শনাক্ত ও প্রতিরোধ করতে;</li>
        <li>প্ল্যাটফর্মে বিজ্ঞাপন প্লেসমেন্ট পরিচালনা করতে এবং বিজ্ঞাপনদাতার জন্য এর পারফরম্যান্স পরিমাপ করতে।</li>
      </ul>

      <h2 className="font-heading text-brand-dark">৪. কে আপনার তথ্য দেখতে পায়</h2>
      <p>অর্ডার পূরণে প্রতিটি পক্ষের প্রয়োজনীয় অংশ করার জন্য যতটুকু দরকার ততটুকুই আমরা শেয়ার করি:</p>
      <ul>
        <li>অর্ডার প্রস্তুত ও হস্তান্তরের জন্য প্রয়োজনীয় গ্রাহকের নাম, ডেলিভারি ঠিকানা, ফোন নম্বর ও অর্ডারের বিষয়বস্তু ভেন্ডর দেখতে পায়।</li>
        <li>ডেলিভারি সম্পন্ন করতে প্রয়োজনীয় গ্রাহকের নাম, ঠিকানা, ফোন নম্বর ও অর্ডারের বিষয়বস্তু রাইডার দেখতে পায়, এবং সক্রিয় ডেলিভারির সময় নিজের লাইভ লোকেশন গ্রাহকের সাথে শেয়ার করে।</li>
        <li>গ্রাহক ভেন্ডরের সর্বজনীন দোকানের তথ্য (নাম, ঠিকানা, লোগো, মেনু) এবং রাইডারের নাম দেখতে পায়, কিন্তু রাইডারের NID, লাইসেন্স নথি বা অন্যান্য ব্যক্তিগত অনবোর্ডিং তথ্য দেখতে পায় না।</li>
        <li>Pick Up অ্যাডমিনরা প্ল্যাটফর্ম পরিচালনা, আবেদন অনুমোদন, বিরোধ নিষ্পত্তি এবং রিফান্ড ও পেআউট প্রক্রিয়ার জন্য প্রয়োজন অনুযায়ী অ্যাকাউন্ট, অর্ডার ও অনবোর্ডিং-নথির তথ্য দেখতে পারেন। ভেন্ডর ও রাইডারের যাচাইকরণ নথি (NID, ট্রেড লাইসেন্স ও অনুরূপ) শুধুমাত্র Pick Up অ্যাডমিন কর্মীদের জন্য ব্যক্তিগতভাবে সংরক্ষিত থাকে — কখনো জনসাধারণের কাছে বা অন্য ভেন্ডর, রাইডার বা গ্রাহকদের কাছে দেখানো হয় না।</li>
      </ul>
      <p>আমরা আপনার ব্যক্তিগত তথ্য তৃতীয় পক্ষের কাছে বিক্রি করি না।</p>

      <h2 className="font-heading text-brand-dark">৫. আপনার তথ্য কোথায় সংরক্ষিত থাকে</h2>
      <p>
        Pick Up-এর ডেটাবেস ও ফাইল স্টোরেজ (আপলোড করা নথি ও ছবিসহ) Supabase-এ হোস্ট করা হয়, যার ডেটা ভারতে অবস্থিত।
        Pick Up অ্যাপ্লিকেশনটি নিজেই Hostinger-এ হোস্ট করা হয়। ডিজিটাল পেমেন্ট আমাদের তৃতীয়-পক্ষ পেমেন্ট
        প্রদানকারীদের নিজস্ব গোপনীয়তা শর্তাবলীর অধীনে প্রক্রিয়া করা হয়; Pick Up আপনার সম্পূর্ণ কার্ড বা
        মোবাইল-ওয়ালেট তথ্য সংরক্ষণ করে না।
      </p>

      <h2 className="font-heading text-brand-dark">৬. আমরা কতদিন আপনার তথ্য রাখি</h2>
      <p>
        আপনার অ্যাকাউন্ট সক্রিয় থাকা পর্যন্ত এবং এরপরও আমাদের আইনি, কর এবং হিসাবরক্ষণ বাধ্যবাধকতা পূরণ এবং কোনো
        বিরোধ নিষ্পত্তির জন্য যুক্তিসঙ্গত সময়ের জন্য আমরা অ্যাকাউন্ট ও অর্ডার তথ্য রাখি। ভেন্ডর ও রাইডারের
        অনবোর্ডিং নথি (NID, ট্রেড লাইসেন্স) ভেন্ডর বা রাইডার অ্যাকাউন্ট সক্রিয় থাকা পর্যন্ত, এবং প্রযোজ্য আইন
        অনুযায়ী প্রয়োজনীয় যেকোনো অতিরিক্ত সময়ের জন্য রাখা হয়। আপনি অ্যাকাউন্ট মুছে ফেলার অনুরোধ করলে, আইনগতভাবে
        রাখতে বাধ্য নই এমন ব্যক্তিগত তথ্য আমরা মুছে ফেলি বা শনাক্তহীন করে দিই।
      </p>

      <h2 className="font-heading text-brand-dark">৭. আপনার পছন্দ</h2>
      <p>
        আপনি যেকোনো সময় আপনার অ্যাকাউন্ট থেকে অ্যাকাউন্টের তথ্য দেখতে ও হালনাগাদ করতে, সংরক্ষিত ঠিকানা পরিচালনা
        করতে এবং অর্ডার ইতিহাস দেখতে পারেন। আপনার ব্যক্তিগত তথ্যের একটি কপি চাইতে, ভুল তথ্য সংশোধনের অনুরোধ করতে,
        বা অ্যাকাউন্ট মুছে ফেলার অনুরোধ করতে সাপোর্টে যোগাযোগ করতে পারেন; আইনগতভাবে নির্দিষ্ট কিছু রেকর্ড (যেমন
        হিসাবরক্ষণ ও কর উদ্দেশ্যে অর্ডার ও পেমেন্ট রেকর্ড) রাখতে বাধ্য না হলে আমরা মুছে ফেলার অনুরোধ কার্যকর করব।
      </p>

      <h2 className="font-heading text-brand-dark">৮. কুকিজ</h2>
      <p>
        আমরা কুকিজ শুধুমাত্র প্রয়োজনীয় সাইট কার্যক্রমের জন্য ব্যবহার করি, বিজ্ঞাপন বা ট্র্যাকিংয়ের জন্য নয়: আপনাকে
        লগ ইন অবস্থায় রাখা, চলমান চেকআউট (ডেলিভারি ঠিকানা ও শিডিউল নির্বাচন) মনে রাখা, প্রয়োগ করা কুপন কোড, এবং
        আপনার ভাষা ও লোকেশন পছন্দ মনে রাখা। আমরা তৃতীয়-পক্ষের বিজ্ঞাপন বা অ্যানালিটিক্স কুকিজ ব্যবহার করি না।
      </p>

      <h2 className="font-heading text-brand-dark">৯. বয়স-নিষিদ্ধ পণ্য</h2>
      <p>
        বয়স-নিষিদ্ধ পণ্য (যেমন সিগারেট ও ধূমপান সামগ্রী) চালু থাকলে, চেকআউটের সময় আপনি ন্যূনতম বয়সের শর্ত পূরণ
        করেন তার নিশ্চিতকরণ এবং ডেলিভারির সময় আমাদের রাইডারের করা যেকোনো বয়স যাচাইয়ের ফলাফল আমরা রেকর্ড করি, তবে
        গ্রাহকদের কাছ থেকে পরিচয়পত্রের সম্পূর্ণ কপি অপ্রয়োজনীয়ভাবে সংরক্ষণ না করে।
      </p>

      <h2 className="font-heading text-brand-dark">১০. নিরাপত্তা</h2>
      <p>
        আপনার তথ্য সুরক্ষিত রাখতে আমরা শিল্প-মানের ব্যবস্থা ব্যবহার করি, যার মধ্যে রয়েছে আপনার ডিভাইস ও আমাদের
        সার্ভারের মধ্যে এনক্রিপ্টেড সংযোগ (HTTPS), হ্যাশ করা পাসওয়ার্ড সংরক্ষণ, এবং যাচাইকরণ নথি ও পেমেন্ট তথ্যের
        মতো সংবেদনশীল তথ্য শুধুমাত্র প্রয়োজনীয় কর্মীদের জন্য সীমাবদ্ধ রাখার অ্যাক্সেস নিয়ন্ত্রণ। কোনো সংরক্ষণ বা
        প্রেরণ পদ্ধতিই সম্পূর্ণ নিরাপদ নয়, এবং আমরা সম্পূর্ণ নিরাপত্তার নিশ্চয়তা দিতে পারি না।
      </p>

      <h2 className="font-heading text-brand-dark">১১. এই নীতির পরিবর্তন</h2>
      <p>
        প্ল্যাটফর্ম বা প্রযোজ্য আইনের পরিবর্তন প্রতিফলিত করতে আমরা মাঝে মাঝে এই গোপনীয়তা নীতি হালনাগাদ করতে পারি।
        নতুন &quot;সর্বশেষ হালনাগাদ&quot; তারিখসহ হালনাগাদ নীতি প্রকাশ করা হবে, এবং গুরুত্বপূর্ণ পরিবর্তন প্ল্যাটফর্মে
        হাইলাইট করা হবে।
      </p>

      <h2 className="font-heading text-brand-dark">১২. যোগাযোগ করুন</h2>
      <p>
        এই নীতি সম্পর্কে প্রশ্ন, বা আপনার তথ্য অ্যাক্সেস, সংশোধন বা মুছে ফেলার অনুরোধ আমাদের{" "}
        <a href="/contact">যোগাযোগ পেজ</a>-এর মাধ্যমে, ইমেইলে <a href="mailto:information@pickupn.com">information@pickupn.com</a>,
        অথবা ফোনে <a href="tel:+8801310790678">+8801310790678</a> নম্বরে পাঠাতে পারেন।
      </p>
    </>
  );
}
